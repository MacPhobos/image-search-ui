# Training Session Restart/Redo Architecture Analysis

**Date**: 2026-01-13
**Context**: User reports training session 40 completed but failed face detection/clustering. Need restart mechanism.
**Goal**: Design safe, idempotent restart system for failed training sessions.

---

## Executive Summary

### Current State

- **Training sessions have partial restart**: `POST /api/v1/training/sessions/{id}/restart?failed_only=true`
- **Face detection has NO restart**: No endpoint to retry face detection after completion
- **Clustering is inline**: Runs as part of face detection, no independent restart
- **Session 40 issue**: Training (CLIP embeddings) succeeded, but face detection/clustering failed or never ran

### Recommendation

Implement **phase-aware restart** with three independent restart operations:

1. **Training restart** (exists, needs minor fixes)
2. **Face detection restart** (NEW - high priority)
3. **Clustering restart** (NEW - medium priority)

### Risk Level: **MEDIUM**

- Training restart is relatively safe (existing code)
- Face detection restart requires careful Qdrant vector cleanup
- Clustering restart is low-risk (just metadata updates)

---

## 1. Current Training Architecture

### 1.1 Database Schema (PostgreSQL)

#### Core Models

**TrainingSession** (`training_sessions` table):

```python
# Status lifecycle
class SessionStatus(str, Enum):
    PENDING = "pending"      # Initial state after creation
    RUNNING = "running"      # Training in progress
    PAUSED = "paused"        # User-paused (resumable)
    COMPLETED = "completed"  # Training finished successfully
    CANCELLED = "cancelled"  # User-cancelled
    FAILED = "failed"        # Training failed with errors

# Key fields
id: int                      # Primary key
name: str                    # User-provided name
status: SessionStatus        # Current lifecycle state
root_path: str               # Directory being trained
category_id: int?            # Category assignment for vectors

# Progress tracking
total_images: int            # Total images discovered
processed_images: int        # Successfully trained images
failed_images: int           # Failed training images
skipped_images: int          # Duplicate images (perceptual hash dedup)

# Timestamps
created_at: datetime         # Session creation
started_at: datetime?        # Training start time
completed_at: datetime?      # Training completion time
paused_at: datetime?         # Pause timestamp
reset_at: datetime?          # Last restart timestamp
reset_reason: str?           # Reason for restart
```

**TrainingJob** (`training_jobs` table):

```python
# One job per image asset
class JobStatus(str, Enum):
    PENDING = "pending"      # Not yet processed
    RUNNING = "running"      # Currently processing
    COMPLETED = "completed"  # Successfully finished
    FAILED = "failed"        # Processing failed
    CANCELLED = "cancelled"  # User-cancelled
    SKIPPED = "skipped"      # Duplicate image (hash match)

# Key fields
id: int
session_id: int              # FK to training_sessions
asset_id: int                # FK to image_assets
status: JobStatus
rq_job_id: str?              # Redis RQ job identifier
progress: int                # 0-100 percentage
error_message: str?          # Error details if failed
processing_time_ms: int?     # Duration in milliseconds
image_path: str?             # Full image path for audit
skip_reason: str?            # "Duplicate of asset {id}"
```

**FaceDetectionSession** (`face_detection_sessions` table):

```python
# One per training session (auto-created after training completes)
class FaceDetectionSessionStatus(str, Enum):
    PENDING = "pending"      # Created, not started
    PROCESSING = "processing" # Face detection running
    COMPLETED = "completed"  # Detection + clustering done
    FAILED = "failed"        # Detection failed
    PAUSED = "paused"        # User-paused (resumable)
    CANCELLED = "cancelled"  # User-cancelled

# Key fields
id: uuid                     # Primary key (UUID)
training_session_id: int?    # FK to training_sessions
status: str
total_images: int            # Images to process
processed_images: int        # Images processed for faces
failed_images: int           # Face detection failures
faces_detected: int          # Total faces found
faces_assigned_to_persons: int  # Auto-assigned to known people
clusters_created: int        # Unknown face clusters created
suggestions_created: int     # Face assignment suggestions

# Resume support
asset_ids_json: str?         # JSON array of asset IDs (for resume)
current_asset_index: int     # Current position in array
current_batch: int           # Current batch number
total_batches: int           # Total batches

# Detection config
min_confidence: float        # Detection threshold (default: 0.5)
min_face_size: int           # Minimum face pixel size (default: 20)
batch_size: int              # Batch size for processing (default: 16)

# Background job
job_id: str?                 # RQ job ID
```

**TrainingEvidence** (`training_evidence` table):

```python
# Audit trail for each trained image
id: int
asset_id: int                # FK to image_assets
session_id: int              # FK to training_sessions
model_name: str              # "OpenCLIP"
model_version: str           # Model identifier (e.g., "ViT-B-32")
embedding_checksum: str?     # SHA256 hash of embedding vector
device: str                  # "cuda", "mps", "cpu"
processing_time_ms: int      # Processing duration
error_message: str?          # Error details if failed
metadata_json: dict?         # Additional metadata (image dims, etc.)
created_at: datetime
```

#### Supporting Models

**ImageAsset** (`image_assets` table):

```python
id: int
path: str                    # Unique file path
thumbnail_path: str?         # Generated thumbnail path
width: int?, height: int?    # Image dimensions
file_size: int?              # Bytes
mime_type: str?              # Image MIME type
training_status: str         # "pending", "trained", etc.
perceptual_hash: str?        # dHash for deduplication
indexed_at: datetime?        # Timestamp of last vector indexing
```

**FaceInstance** (`face_instances` table):

```python
id: uuid
asset_id: int                # FK to image_assets
bbox_x, bbox_y, bbox_w, bbox_h: int  # Bounding box coordinates
landmarks: dict?             # 5-point facial landmarks (JSON)
detection_confidence: float  # Detection confidence score
quality_score: float?        # Face quality assessment
qdrant_point_id: uuid        # Vector in Qdrant (unique)
cluster_id: str?             # Unknown face cluster ID
person_id: uuid?             # FK to persons (if assigned)
created_at: datetime
updated_at: datetime
```

**Person** (`persons` table):

```python
id: uuid
name: str                    # Person's name (unique, case-insensitive)
status: PersonStatus         # "active", "merged", "hidden"
birth_date: date?            # For age-era classification
```

**PersonPrototype** (`person_prototypes` table):

```python
# Representative faces for face matching
id: uuid
person_id: uuid              # FK to persons
face_instance_id: uuid?      # FK to face_instances (null for centroid)
qdrant_point_id: uuid        # Vector in Qdrant
role: PrototypeRole          # "centroid", "exemplar", "temporal", etc.
age_era_bucket: str?         # "infant", "child", "teen", etc.
is_pinned: bool              # User-pinned primary photo
```

### 1.2 Training Workflow (Phase 1: CLIP Embeddings)

**Entry Point**: `POST /api/v1/training/sessions/{id}/start`

**Orchestration Flow**:

```python
# services/training_service.py::start_training()
1. Validate session state (must be PENDING, PAUSED, or FAILED)
2. If PENDING:
   - Discover assets via AssetDiscoveryService
   - Create TrainingJob records for each asset
   - Apply perceptual hash deduplication:
     - Group assets by perceptual_hash
     - Representative (oldest) → PENDING job
     - Duplicates → SKIPPED jobs with skip_reason
   - Update session.total_images, session.skipped_images
3. Update session status to RUNNING
4. Enqueue RQ job: train_session(session_id)
5. Return session

# queue/training_jobs.py::train_session()
1. Query all PENDING jobs for session
2. Process in batches (default: 32 images):
   - Check for pause/cancellation (ProgressTracker.should_stop())
   - Call train_batch(session_id, asset_ids, batch_num)
   - Update progress counters
3. Mark session as COMPLETED
4. Auto-trigger face detection (see Phase 2)
```

**Batch Processing Pipeline** (`train_batch()`):

```
Producer Thread (I/O):
├─ Load images in parallel (ThreadPoolExecutor, 4 workers)
├─ Queue loaded batches (bounded queue, size 4)
└─ Send sentinel when complete

Main Thread (GPU + DB):
├─ While True:
│  ├─ Dequeue loaded batch (timeout 0.1s)
│  ├─ Batch GPU embedding (OpenCLIP)
│  │  └─ Returns list[float] vectors (512-dim for ViT-B-32)
│  ├─ For each (job, asset, embedding):
│  │  ├─ Calculate SHA256 checksum
│  │  ├─ Buffer Qdrant point: {asset_id, vector, payload}
│  │  ├─ Update job status to COMPLETED
│  │  ├─ Create TrainingEvidence record
│  │  └─ Increment subdirectory trained_count
│  ├─ Flush Qdrant buffer when full (100 vectors)
│  └─ Periodic garbage collection (every N images, critical for MPS)
└─ Flush remaining Qdrant buffer
```

**External State Created**:

- **Qdrant vectors**: Collection "image_embeddings", 512-dim vectors
  - Point ID: `asset_id` (integer)
  - Payload: `{path: str, created_at: str, category_id: int?}`
  - Index: HNSW for fast similarity search

### 1.3 Face Detection Workflow (Phase 2)

**Entry Point**: Auto-triggered by `train_session()` on completion OR manual via face detection API

**Orchestration Flow**:

```python
# queue/training_jobs.py::train_session() (lines 243-300)
1. After training COMPLETED:
   - Check if FaceDetectionSession already exists for this training session
   - If exists: Skip auto-trigger (prevent duplicates)
   - If not exists:
     - Create FaceDetectionSession (PENDING status)
     - Enqueue face_jobs.detect_faces_for_session_job(session_id)
     - Store RQ job_id on face session

# queue/face_jobs.py::detect_faces_for_session_job()
1. Query trained images from training session
2. Process in batches (default: 16 images):
   - Load images
   - InsightFace detection (buffalo_l model)
   - For each detected face:
     - Create FaceInstance record (bbox, confidence, landmarks)
     - Generate face embedding (512-dim ArcFace vector)
     - Store embedding in Qdrant collection "face_embeddings"
     - Point ID: face_instance.qdrant_point_id (UUID)
3. Update FaceDetectionSession progress counters
4. On completion: Auto-trigger clustering (see Phase 3)
```

**External State Created**:

- **Qdrant vectors**: Collection "face_embeddings", 512-dim vectors
  - Point ID: `face_instance.qdrant_point_id` (UUID)
  - Payload: `{asset_id: int, bbox: dict, person_id: uuid?, cluster_id: str?}`
  - Index: HNSW for face similarity search
- **Database records**:
  - FaceInstance rows (one per detected face)
  - No Person/Prototype records yet (created in Phase 3)

### 1.4 Clustering Workflow (Phase 3)

**Entry Point**: Auto-triggered by face detection completion

**Orchestration Flow**:

```python
# queue/face_jobs.py::detect_faces_for_session_job() (end of function)
1. After face detection COMPLETED:
   - Call services/face_clustering_service.py::cluster_and_assign_faces()
   - Dual-phase clustering:
     - Phase 3a: Match unknowns to known persons (existing prototypes)
     - Phase 3b: Cluster remaining unknowns (HDBSCAN)

# Phase 3a: Known Person Matching
1. Query all FaceInstance where person_id IS NULL (unknowns)
2. Query all PersonPrototype vectors from Qdrant
3. For each unknown face:
   - Find nearest prototype (cosine similarity)
   - If similarity > threshold (default: 0.7):
     - Assign face_instance.person_id = prototype.person_id
     - Create FaceSuggestion record (ACCEPTED status)
     - Update FaceDetectionSession.faces_assigned_to_persons

# Phase 3b: Unknown Face Clustering (HDBSCAN)
1. Query remaining unassigned faces
2. Fetch embeddings from Qdrant
3. Run HDBSCAN clustering:
   - min_cluster_size: 3 (from config)
   - min_samples: 2
   - metric: "cosine"
4. For each cluster:
   - Generate cluster_id: "unknown_{uuid}"
   - Update FaceInstance.cluster_id for all faces in cluster
   - Create Person record (name: "Unknown Person {N}")
   - Select cluster centroid as PersonPrototype (role: CENTROID)
   - Update FaceDetectionSession.clusters_created
5. For noise points (cluster_id = -1):
   - Leave unassigned (person_id = NULL, cluster_id = NULL)
```

**External State Created**:

- **Database records**:
  - Person rows (one per cluster + existing known persons)
  - PersonPrototype rows (centroids for clusters, exemplars for known persons)
  - FaceSuggestion rows (auto-accepted for matched persons)
- **Updated FaceInstance records**:
  - person_id assigned (via matching or clustering)
  - cluster_id assigned (for unknown clusters)
- **Qdrant updates**:
  - face_embeddings payload updated with person_id, cluster_id

---

## 2. Current Restart Mechanism

### 2.1 Existing Endpoint: `/api/v1/training/sessions/{id}/restart`

**API Signature**:

```python
POST /api/v1/training/sessions/{id}/restart?failed_only=true
```

**Parameters**:

- `failed_only` (bool, default: `true`):
  - `true`: Only restart FAILED jobs
  - `false`: Restart ALL jobs (full wipe and re-train)

**Implementation** (`services/training_service.py::restart_training`):

```python
async def restart_training(
    db: AsyncSession, session_id: int, failed_only: bool = True
) -> TrainingSession:
    session = await get_session(db, session_id)

    # Reset jobs based on flag
    if failed_only:
        jobs_reset = await reset_failed_jobs(db, session_id)
    else:
        jobs_reset = await reset_all_jobs(db, session_id)

    # Reset session counters
    session.processed_images = 0
    session.failed_images = 0
    session.status = SessionStatus.PENDING.value
    session.started_at = None
    session.completed_at = None
    session.paused_at = None

    # Start training
    return await start_training(db, session_id)
```

**reset_failed_jobs()** (lines 833-861):

```python
# Query jobs where status = FAILED
# For each job:
#   - status = PENDING
#   - progress = 0
#   - error_message = None
#   - started_at = None
#   - completed_at = None
# Returns: count of jobs reset
```

**reset_all_jobs()** (lines 863-888):

```python
# Query ALL jobs for session
# For each job:
#   - status = PENDING
#   - progress = 0
#   - error_message = None
#   - started_at = None
#   - completed_at = None
#   - processing_time_ms = None
# Returns: count of jobs reset
```

### 2.2 What Restart DOES Clean Up

✅ **Database State**:

- TrainingJob status reset to PENDING
- TrainingJob error messages cleared
- TrainingSession counters reset (processed_images, failed_images)
- TrainingSession timestamps cleared (started_at, completed_at)

### 2.3 What Restart DOES NOT Clean Up

❌ **Database State**:

- TrainingEvidence records (audit trail preserved)
- TrainingSubdirectory counts (trained_count preserved)
- ImageAsset metadata (indexed_at, training_status preserved)

❌ **Qdrant Vectors**:

- Existing vectors in "image_embeddings" collection NOT deleted
- Re-training creates duplicate vectors (same asset_id overwrites)
- **This is INTENTIONAL** for idempotency (upsert behavior)

❌ **Face Detection State**:

- FaceDetectionSession NOT deleted or reset
- FaceInstance records NOT deleted
- Qdrant "face_embeddings" vectors NOT deleted
- Person/Prototype records NOT deleted

**CRITICAL GAP**: Restart only affects Phase 1 (training). Phases 2-3 are untouched.

---

## 3. Session 40 Failure Analysis

### 3.1 What We Know

**Symptoms**:

- Training session 40 shows status: `COMPLETED`
- Face detection/clustering did NOT run or failed
- User needs to redo face detection without retraining embeddings

**Possible Root Causes**:

1. **Auto-trigger failed** (lines 243-300 of training_jobs.py):
   - Exception during FaceDetectionSession creation
   - Exception during RQ job enqueue
   - Error logged but training still marked COMPLETED
   - Face session created but job never queued

2. **Face detection job failed silently**:
   - RQ job exception not propagated to session status
   - Worker crash (Signal 11, out of memory, etc.)
   - FaceDetectionSession stuck in PROCESSING

3. **Face detection session already existed**:
   - Previous manual face detection attempt
   - Auto-trigger skipped (lines 258-263)
   - Original face session failed but not reset

4. **Clustering failed** (Phase 3):
   - Face detection completed successfully
   - Clustering exception during HDBSCAN
   - FaceDetectionSession marked COMPLETED but clusters_created = 0

### 3.2 Diagnostic Queries

```sql
-- Check training session status
SELECT id, name, status, total_images, processed_images, failed_images,
       started_at, completed_at
FROM training_sessions WHERE id = 40;

-- Check if face detection session exists
SELECT id, status, total_images, processed_images, failed_images,
       faces_detected, faces_assigned_to_persons, clusters_created,
       suggestions_created, job_id
FROM face_detection_sessions
WHERE training_session_id = 40;

-- Check training job counts by status
SELECT status, COUNT(*)
FROM training_jobs
WHERE session_id = 40
GROUP BY status;

-- Check if any face instances exist
SELECT COUNT(*)
FROM face_instances fi
JOIN image_assets ia ON fi.asset_id = ia.id
JOIN training_jobs tj ON tj.asset_id = ia.id
WHERE tj.session_id = 40;

-- Check Qdrant image embeddings (via API)
GET /api/v1/vectors/count?category_id={session_40_category_id}

-- Check Qdrant face embeddings (via API)
# Count faces detected for assets in session 40
```

### 3.3 Most Likely Scenario

Based on code review, **Scenario 1** is most likely:

- Training completed successfully (all jobs COMPLETED)
- Auto-trigger face detection failed with exception (lines 296-300)
- Exception caught and logged, training still marked COMPLETED
- No FaceDetectionSession created OR session created but job not queued
- User sees COMPLETED training but no face detection

**Evidence to Check**:

- Backend logs around training session 40 completion timestamp
- Search for: `"Failed to auto-trigger face detection for training session 40"`
- Check if FaceDetectionSession exists in database

---

## 4. Restart Requirements Analysis

### 4.1 User Expectations

**"Restart" vs "Redo" Semantics**:

| User Intent            | System Action                                | Scope           |
| ---------------------- | -------------------------------------------- | --------------- |
| "Retry training"       | Re-run failed embedding jobs                 | Phase 1 only    |
| "Reset and start over" | Wipe everything, full re-train               | All 3 phases    |
| "Redo face detection"  | Re-run face detection on existing embeddings | Phases 2-3 only |
| "Recluster faces"      | Re-run clustering on existing face instances | Phase 3 only    |

**Session 40 Specific Need**: "Redo face detection" (Phases 2-3)

### 4.2 Safe Restart Strategy

**Principle**: **Idempotent operations with explicit cleanup**

#### Strategy 1: Training Restart (Phase 1) - EXISTING

**Current Implementation**:

```python
POST /api/v1/training/sessions/{id}/restart?failed_only=true
```

**What it should do**:

1. Reset TrainingJob records (FAILED → PENDING or ALL → PENDING)
2. Reset session counters and timestamps
3. Re-run training workflow
4. **Qdrant vectors are overwritten** (upsert behavior)
5. **TrainingEvidence preserved** (audit trail)

**Safety**: ✅ Safe (existing code, well-tested)

**Improvement Needed**:

- Add `reset_at` timestamp
- Add `reset_reason` field (user-provided or auto: "Manual restart")
- Log restart event to audit trail

#### Strategy 2: Face Detection Restart (Phase 2) - NEW

**Proposed Endpoint**:

```python
POST /api/v1/training/sessions/{id}/restart-faces
```

**What it should do**:

1. Find or create FaceDetectionSession for training_session_id
2. If FaceDetectionSession exists:
   - Delete all FaceInstance records for this session's assets
   - Delete corresponding Qdrant vectors (face_embeddings collection)
   - Delete FaceSuggestion records for deleted face instances
   - Delete Person/PersonPrototype records created by this session (tricky!)
   - Reset session counters and timestamps
3. Update FaceDetectionSession status to PENDING
4. Enqueue face detection job
5. Return FaceDetectionSession

**Cleanup Complexity**:

**Easy to Delete**:

- FaceInstance records (query by asset_id IN session assets)
- Qdrant face vectors (delete by face_instance.qdrant_point_id list)
- FaceSuggestion records (FK cascade from face_instances)

**Hard to Delete**:

- **Person records**: How to know which were created by this session?
  - Option A: Add `created_by_session_id` to Person table (schema change)
  - Option B: Delete all Persons where ALL face_instances are from this session
  - Option C: Don't delete Persons, orphan them (leave for manual cleanup)
- **PersonPrototype records**: Similar problem
  - Cascade delete if Person is deleted
  - Otherwise orphaned prototypes remain

**Recommended Approach**: **Option C (Conservative)**

- Delete FaceInstance + FaceSuggestion + Qdrant vectors
- Leave Person/PersonPrototype records intact
- Mark orphaned Persons with special status ("orphaned" or keep "active")
- UI shows warning: "Persons created from previous run still exist, merge manually"
- Provides safety net against accidental data loss

**Safety**: ⚠️ Medium Risk

- Vector deletion is irreversible
- Orphaned Person records require manual cleanup
- Potential for duplicate Person records if re-run creates same clusters

#### Strategy 3: Clustering Restart (Phase 3) - NEW

**Proposed Endpoint**:

```python
POST /api/v1/training/sessions/{id}/restart-clustering
```

**What it should do**:

1. Find FaceDetectionSession for training_session_id
2. Validate face detection is complete (faces_detected > 0)
3. Clear clustering state:
   - Reset FaceInstance.person_id to NULL (for auto-assigned faces)
   - Reset FaceInstance.cluster_id to NULL
   - Delete Person records created by clustering (cluster_id prefix)
   - Delete PersonPrototype records (FK cascade)
   - Delete FaceSuggestion records (status = ACCEPTED from clustering)
4. Update FaceDetectionSession clustering counters to 0
5. Re-run clustering logic (cluster_and_assign_faces)
6. Return FaceDetectionSession

**Cleanup Complexity**:

**Easy to Clear**:

- FaceInstance.cluster_id (just set to NULL)
- FaceInstance.person_id (set to NULL for non-manual assignments)
- FaceSuggestion records (delete where status = ACCEPTED, created during clustering)

**Tricky to Clear**:

- **Person records**: Which were created by clustering vs manual?
  - Option A: Add `created_by` field ("clustering", "manual", "import")
  - Option B: Use naming convention ("Unknown Person {N}" = clustering)
  - Option C: Track in separate ClusterSession table (overkill)
- **PersonPrototype records**: Same issue

**Recommended Approach**: **Option B (Naming Convention)**

- Delete Person records where name starts with "Unknown Person"
- Delete FaceSuggestion where status = ACCEPTED
- Reset FaceInstance cluster/person assignments
- Re-run HDBSCAN clustering

**Safety**: ✅ Relatively Safe

- No vector deletion (Qdrant untouched)
- Only affects metadata (person_id, cluster_id)
- Unknown persons are auto-generated, low risk to delete

#### Strategy 4: Full Reset - NEW

**Proposed Endpoint**:

```python
POST /api/v1/training/sessions/{id}/reset-all
```

**What it should do**:

1. Call restart_training(failed_only=False) - Phase 1 cleanup
2. Call restart-faces() - Phase 2-3 cleanup
3. Return unified status

**Safety**: ⚠️ High Risk

- Deletes ALL work (embeddings, faces, clusters)
- Irreversible without backups
- Should require confirmation flag: `?confirm=true`

---

## 5. Implementation Complexity Estimates

### 5.1 Backend Changes

#### Phase 1: Training Restart Improvements (LOW)

**Effort**: 2-4 hours
**Files Modified**:

- `services/training_service.py::restart_training()` - Add reset_at, reset_reason
- `db/models.py::TrainingSession` - Already has fields, just use them
- `api/routes/training.py` - Add reset_reason query param

**Testing**:

- Existing tests cover restart logic
- Add test for reset_at/reset_reason persistence

#### Phase 2: Face Detection Restart (MEDIUM-HIGH)

**Effort**: 1-2 days
**Files Modified**:

- Create `services/face_restart_service.py` - New service for face cleanup
- `api/routes/faces.py` (or training.py) - New endpoint
- `db/models.py` - Potentially add session tracking fields
- `queue/face_jobs.py` - Ensure idempotent re-run

**New Service Methods**:

```python
class FaceRestartService:
    async def cleanup_face_detection(
        db: AsyncSession,
        training_session_id: int,
        delete_persons: bool = False  # Conservative default
    ) -> dict[str, int]:
        """Delete face instances and optionally persons.

        Returns:
            {
                "face_instances_deleted": int,
                "qdrant_vectors_deleted": int,
                "persons_orphaned": int,
                "persons_deleted": int
            }
        """

    async def restart_face_detection(
        db: AsyncSession,
        training_session_id: int
    ) -> FaceDetectionSession:
        """Full restart: cleanup + re-enqueue."""
```

**Testing**:

- Unit tests for cleanup logic
- Integration test: train → detect → restart → detect again
- Qdrant vector count validation
- Person orphaning behavior test

#### Phase 3: Clustering Restart (MEDIUM)

**Effort**: 1 day
**Files Modified**:

- `services/face_clustering_service.py` - Add reset method
- `api/routes/faces.py` - New endpoint
- `db/models.py` - Potentially add created_by field to Person

**New Service Methods**:

```python
class FaceClusteringService:
    async def reset_clustering(
        db: AsyncSession,
        training_session_id: int
    ) -> dict[str, int]:
        """Reset clustering state, delete unknown persons.

        Returns:
            {
                "face_instances_reset": int,
                "unknown_persons_deleted": int,
                "suggestions_deleted": int
            }
        """
```

**Testing**:

- Unit test for reset logic
- Integration test: detect → cluster → reset → cluster again
- Verify known persons unaffected

### 5.2 Frontend Changes

#### UI Restart Button (LOW-MEDIUM)

**Effort**: 4-6 hours
**Files Modified**:

- `src/lib/components/training/SessionDetailView.svelte` - Add restart buttons
- `src/lib/api/training.ts` - Add restartFaces(), restartClustering() clients
- `src/lib/types.ts` - Add restart response types

**UI Design**:

```svelte
<!-- Training Session Detail View -->
{#if session.status === 'completed'}
	<div class="restart-actions">
		{#if faceDetection?.status === 'failed' || !faceDetection}
			<button on:click={handleRestartFaces}> 🔄 Retry Face Detection </button>
		{/if}

		{#if faceDetection?.status === 'completed' && faceDetection.clusters_created === 0}
			<button on:click={handleRestartClustering}> 🔄 Retry Clustering </button>
		{/if}

		<button on:click={handleRestartAll} class="danger"> ⚠️ Reset All (Training + Faces) </button>
	</div>
{/if}
```

**Modal Confirmations**:

- Face detection restart: Warn about deleting faces/suggestions
- Clustering restart: Warn about deleting unknown persons
- Full reset: Require typed confirmation ("RESET")

### 5.3 Testing Strategy

**Integration Tests** (Critical):

```python
# Test: Face detection restart idempotency
1. Create training session
2. Train images (Phase 1)
3. Detect faces (Phase 2)
4. Verify N face instances created
5. Restart face detection
6. Verify:
   - Old face instances deleted
   - Qdrant vectors deleted
   - New face instances created (same count as before)
   - No duplicate persons

# Test: Clustering restart
1. Train + detect faces
2. Cluster faces (create unknown persons)
3. Manually assign some faces to known persons
4. Restart clustering
5. Verify:
   - Unknown persons deleted
   - Manual assignments preserved
   - New clusters created
```

---

## 6. Risks and Mitigations

### 6.1 Data Loss Risks

| Risk                                                      | Impact | Likelihood | Mitigation                                                            |
| --------------------------------------------------------- | ------ | ---------- | --------------------------------------------------------------------- |
| Accidental deletion of manually assigned faces            | HIGH   | MEDIUM     | Conservative default: don't delete known persons                      |
| Qdrant vector deletion failure leaves orphaned DB records | MEDIUM | LOW        | Transaction-like cleanup: delete Qdrant first, rollback DB on failure |
| Restart while job running causes race condition           | HIGH   | MEDIUM     | Check job status before restart, cancel running jobs first            |
| User restarts wrong session                               | MEDIUM | HIGH       | Confirmation modal with session details                               |

### 6.2 Performance Risks

| Risk                                         | Impact | Mitigation                            |
| -------------------------------------------- | ------ | ------------------------------------- |
| Deleting 100k+ face instances takes too long | MEDIUM | Batch delete in chunks, show progress |
| Qdrant bulk delete timeout                   | LOW    | Use scroll + batch delete pattern     |
| Re-running face detection on large dataset   | HIGH   | User's choice, show estimated time    |

### 6.3 Idempotency Risks

| Risk                                             | Impact | Mitigation                                           |
| ------------------------------------------------ | ------ | ---------------------------------------------------- |
| Restart called twice simultaneously              | MEDIUM | Lock session during restart (DB row lock)            |
| Face detection auto-trigger after manual restart | LOW    | Check if session exists before auto-trigger          |
| Clustering creates duplicate persons             | MEDIUM | Use deterministic cluster naming, check for existing |

---

## 7. Recommended Implementation Plan

### Phase 1: Immediate (Fix Session 40)

**Effort**: 2-4 hours
**Scope**: Manual intervention to fix session 40

**Steps**:

1. Query session 40 state (diagnostics from Section 3.2)
2. If no FaceDetectionSession exists:
   - Manually create FaceDetectionSession
   - Enqueue face detection job
3. If FaceDetectionSession exists but failed:
   - Delete face instances/vectors
   - Reset session status to PENDING
   - Re-enqueue job

**Deliverable**: Session 40 working, document manual process

### Phase 2: Face Detection Restart API (Short-term)

**Effort**: 1-2 days
**Priority**: HIGH
**Scope**: Backend endpoint for face detection restart

**Tasks**:

1. Implement `FaceRestartService.cleanup_face_detection()`
2. Add `POST /api/v1/training/sessions/{id}/restart-faces` endpoint
3. Add conservative person orphaning (Option C)
4. Write integration tests
5. Update API contract docs

**Deliverable**: Working API for face detection restart

### Phase 3: UI Integration (Short-term)

**Effort**: 4-6 hours
**Priority**: HIGH
**Scope**: Add restart buttons to UI

**Tasks**:

1. Add restart buttons to SessionDetailView
2. Implement confirmation modals
3. Add API client functions
4. Show restart progress/status
5. Update UI to show face detection session status

**Deliverable**: User can restart face detection from UI

### Phase 4: Clustering Restart (Medium-term)

**Effort**: 1 day
**Priority**: MEDIUM
**Scope**: Clustering-only restart

**Tasks**:

1. Implement `FaceClusteringService.reset_clustering()`
2. Add endpoint
3. Add UI button (conditional on face detection completed)
4. Add naming convention check for unknown persons
5. Write tests

**Deliverable**: Clustering restart without re-detecting faces

### Phase 5: Training Restart Improvements (Low priority)

**Effort**: 2-4 hours
**Priority**: LOW
**Scope**: Add audit fields to existing restart

**Tasks**:

1. Use reset_at timestamp
2. Add reset_reason (query param)
3. Log restart events
4. Update API docs

**Deliverable**: Better audit trail for training restarts

---

## 8. API Contract Additions

### New Endpoints

```yaml
# Face Detection Restart
POST /api/v1/training/sessions/{session_id}/restart-faces
Query Params:
  - delete_persons: boolean (default: false) - Delete orphaned persons
Response: 200 OK
  {
    "sessionId": 40,
    "status": "pending",
    "message": "Face detection restarted",
    "cleanup": {
      "faceInstancesDeleted": 1234,
      "qdrantVectorsDeleted": 1234,
      "personsOrphaned": 5,
      "personsDeleted": 0
    }
  }
Errors:
  - 404: Training session not found
  - 400: Training session not completed
  - 409: Face detection already running

# Clustering Restart
POST /api/v1/training/sessions/{session_id}/restart-clustering
Response: 200 OK
  {
    "sessionId": 40,
    "status": "pending",
    "message": "Clustering restarted",
    "cleanup": {
      "faceInstancesReset": 1234,
      "unknownPersonsDeleted": 15,
      "suggestionsDeleted": 234
    }
  }
Errors:
  - 404: Training session not found
  - 400: Face detection not completed
  - 409: Clustering already running

# Full Reset
POST /api/v1/training/sessions/{session_id}/reset-all?confirm=true
Query Params:
  - confirm: boolean (required: true) - Safety check
Response: 200 OK
  {
    "sessionId": 40,
    "status": "pending",
    "message": "Full reset completed",
    "cleanup": {
      "trainingJobsReset": 5000,
      "faceInstancesDeleted": 1234,
      "qdrantImageVectors": "preserved (overwritten on re-train)",
      "qdrantFaceVectors": 1234,
      "personsOrphaned": 5
    }
  }
```

---

## 9. File Locations Reference

### Backend (Python)

**Core Training Logic**:

- `src/image_search_service/db/models.py` - TrainingSession, TrainingJob, FaceDetectionSession models
- `src/image_search_service/services/training_service.py` - Training session CRUD, restart logic
- `src/image_search_service/queue/training_jobs.py` - Background training jobs, auto-trigger face detection
- `src/image_search_service/api/routes/training.py` - Training REST API endpoints

**Face Detection Logic**:

- `src/image_search_service/queue/face_jobs.py` - Face detection background jobs (65KB file!)
- `src/image_search_service/services/face_clustering_service.py` - Clustering logic

**Database Operations**:

- `src/image_search_service/db/sync_operations.py` - Sync DB operations for RQ jobs
- `src/image_search_service/db/session.py` - Async DB session factory

**Vector Storage**:

- `src/image_search_service/vector/qdrant.py` - Qdrant client, upsert/delete operations

### Frontend (TypeScript/Svelte)

**Training UI**:

- `src/routes/training/+page.svelte` - Training sessions list
- `src/routes/training/[sessionId]/+page.svelte` - Session detail page
- `src/lib/components/training/SessionDetailView.svelte` - Main session detail component

**API Clients**:

- `src/lib/api/training.ts` - Training API client functions
- `src/lib/api/faces.ts` - Face detection/clustering API clients
- `src/lib/api/generated.ts` - Auto-generated OpenAPI types (DO NOT EDIT)

**Types**:

- `src/lib/types.ts` - Frontend type definitions

---

## 10. Conclusion

### Summary of Findings

1. **Training restart exists** but only covers Phase 1 (CLIP embeddings)
2. **Face detection has NO restart mechanism** - this is the gap for Session 40
3. **Clustering is inline with face detection** - no independent restart
4. **Auto-trigger can fail silently** - training marked COMPLETED even if face detection fails to start

### Recommended Solution

Implement **three-phase restart system**:

1. **Training restart** (enhance existing)
2. **Face detection restart** (NEW - high priority)
3. **Clustering restart** (NEW - medium priority)

### Complexity Assessment

| Component                     | Complexity  | Risk   | Priority |
| ----------------------------- | ----------- | ------ | -------- |
| Training restart improvements | LOW         | LOW    | LOW      |
| Face detection restart        | MEDIUM-HIGH | MEDIUM | HIGH     |
| Clustering restart            | MEDIUM      | LOW    | MEDIUM   |
| UI integration                | LOW-MEDIUM  | LOW    | HIGH     |

### Next Steps for Session 40

**Immediate Action**:

1. Run diagnostic queries (Section 3.2)
2. Check backend logs for auto-trigger failure
3. If no FaceDetectionSession: Create manually and enqueue
4. If FaceDetectionSession failed: Reset and re-run

**Long-term Action**:

1. Implement Phase 2 (Face detection restart API)
2. Implement Phase 3 (UI integration)
3. Implement Phase 4 (Clustering restart)
4. Add monitoring/alerts for auto-trigger failures

---

## Appendix A: Qdrant Collection Schema

### image_embeddings Collection

```python
{
  "name": "image_embeddings",
  "vector_size": 512,  # OpenCLIP ViT-B-32
  "distance": "Cosine",
  "points": [
    {
      "id": 12345,  # asset_id (integer)
      "vector": [0.123, ...],  # 512-dim embedding
      "payload": {
        "path": "/path/to/image.jpg",
        "created_at": "2025-01-01T12:00:00Z",
        "category_id": 5
      }
    }
  ]
}
```

### face_embeddings Collection

```python
{
  "name": "face_embeddings",
  "vector_size": 512,  # InsightFace ArcFace
  "distance": "Cosine",
  "points": [
    {
      "id": "uuid-string",  # face_instance.qdrant_point_id
      "vector": [0.456, ...],  # 512-dim face embedding
      "payload": {
        "asset_id": 12345,
        "bbox": {"x": 100, "y": 200, "w": 150, "h": 150},
        "person_id": "uuid-or-null",
        "cluster_id": "unknown_abc123 or null"
      }
    }
  ]
}
```

---

## Appendix B: Sample Diagnostic Output

```sql
-- Training session 40 status
SELECT * FROM training_sessions WHERE id = 40;
-- Expected: status='completed', processed_images > 0

-- Face detection session check
SELECT * FROM face_detection_sessions WHERE training_session_id = 40;
-- Case 1: No rows → Auto-trigger failed to create session
-- Case 2: status='pending' → Session created but job not started
-- Case 3: status='failed' → Job ran but failed
-- Case 4: status='completed', faces_detected=0 → Detection ran but found no faces

-- Training jobs breakdown
SELECT status, COUNT(*) FROM training_jobs WHERE session_id = 40 GROUP BY status;
-- Expected: All COMPLETED or SKIPPED (no FAILED)

-- Face instances check
SELECT COUNT(*) FROM face_instances fi
JOIN image_assets ia ON fi.asset_id = ia.id
JOIN training_jobs tj ON tj.asset_id = ia.id
WHERE tj.session_id = 40;
-- Expected: > 0 if face detection ran, 0 if it didn't

-- Qdrant vector count (via API)
GET /api/v1/vectors/count?category_id={session_40_category_id}
-- Should match processed_images count from training session
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-13
**Author**: Research Agent
**Status**: Analysis Complete - Ready for Implementation Planning
