from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _now() -> datetime:
    return datetime.utcnow()


class Organization(Base):
    __tablename__ = "organization"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    parent_id: Mapped[str | None] = mapped_column(String(64), nullable=True)


class Role(Base):
    __tablename__ = "role"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    name: Mapped[str] = mapped_column(String(64))


class User(Base):
    __tablename__ = "user"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(64))
    org_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("organization.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class UserRole(Base):
    __tablename__ = "user_role"
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("user.id"), primary_key=True)
    role_id: Mapped[str] = mapped_column(String(64), ForeignKey("role.id"), primary_key=True)


class Project(Base):
    __tablename__ = "project"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    code: Mapped[str] = mapped_column(String(64), unique=True)
    owner_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("user.id"))
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Dataset(Base):
    __tablename__ = "dataset"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(64), ForeignKey("project.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    modality: Mapped[str] = mapped_column(String(64))
    version: Mapped[str] = mapped_column(String(32), default="v1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Sample(Base):
    __tablename__ = "sample"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    dataset_id: Mapped[str] = mapped_column(String(64), ForeignKey("dataset.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    modality: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="raw")
    meta_json: Mapped[dict | None] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class SampleFile(Base):
    __tablename__ = "sample_file"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    sample_id: Mapped[str] = mapped_column(String(64), ForeignKey("sample.id"), index=True)
    file_type: Mapped[str] = mapped_column(String(32))
    path: Mapped[str] = mapped_column(String(512))
    checksum: Mapped[str | None] = mapped_column(String(128), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)


class FileAsset(Base):
    __tablename__ = "file_asset"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    path: Mapped[str] = mapped_column(String(512))
    mime: Mapped[str | None] = mapped_column(String(128), nullable=True)
    size: Mapped[int] = mapped_column(Integer, default=0)
    uploader_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("user.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class AnnotationTask(Base):
    __tablename__ = "annotation_task"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("project.id"))
    dataset_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("dataset.id"))
    title: Mapped[str] = mapped_column(String(256))
    modality: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32), default="created", index=True)
    priority: Mapped[str] = mapped_column(String(16), default="A")
    assignee_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("user.id"))
    creator_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("user.id"))
    sample_count: Mapped[int] = mapped_column(Integer, default=1)
    done_count: Mapped[int] = mapped_column(Integer, default=0)
    labels_snapshot: Mapped[list | None] = mapped_column(JSON, default=list)
    resource_json: Mapped[dict | None] = mapped_column(JSON, default=dict)
    reject_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    rework_trail: Mapped[list | None] = mapped_column(JSON, default=list)
    collaborators: Mapped[list | None] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class TaskAssignment(Base):
    __tablename__ = "task_assignment"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(64), ForeignKey("annotation_task.id"), index=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("user.id"))
    role: Mapped[str] = mapped_column(String(32), default="annotator")
    sample_ids_json: Mapped[list | None] = mapped_column(JSON, default=list)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class AnnotationResult(Base):
    __tablename__ = "annotation_result"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(64), ForeignKey("annotation_task.id"), index=True)
    sample_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("sample.id"))
    version: Mapped[int] = mapped_column(Integer, default=1)
    payload_json: Mapped[dict | list | None] = mapped_column(JSON)
    mask_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    actor_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("user.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class AnnotationComment(Base):
    __tablename__ = "annotation_comment"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(64), ForeignKey("annotation_task.id"), index=True)
    sample_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    author_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("user.id"))
    author_name: Mapped[str] = mapped_column(String(64), default="")
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ReviewRecord(Base):
    __tablename__ = "review_record"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(64), ForeignKey("annotation_task.id"), index=True)
    level: Mapped[int] = mapped_column(Integer, default=1)
    reviewer_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("user.id"))
    decision: Mapped[str] = mapped_column(String(32))
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ReviewHistory(Base):
    __tablename__ = "review_history"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(64), ForeignKey("annotation_task.id"), index=True)
    from_status: Mapped[str] = mapped_column(String(32))
    to_status: Mapped[str] = mapped_column(String(32))
    actor_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("user.id"))
    actor_name: Mapped[str] = mapped_column(String(64), default="")
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class QualityRule(Base):
    __tablename__ = "quality_rule"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    ratio: Mapped[float] = mapped_column(Float, default=0.1)
    modalities_json: Mapped[list | None] = mapped_column(JSON, default=list)
    threshold: Mapped[float] = mapped_column(Float, default=0.9)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class QualityInspection(Base):
    __tablename__ = "quality_inspection"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    rule_id: Mapped[str] = mapped_column(String(64), ForeignKey("quality_rule.id"))
    task_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mode: Mapped[str] = mapped_column(String(32), default="random")
    status: Mapped[str] = mapped_column(String(32), default="running")
    result_json: Mapped[dict | None] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class QualityRecord(Base):
    __tablename__ = "quality_record"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    inspection_id: Mapped[str] = mapped_column(String(64), ForeignKey("quality_inspection.id"), index=True)
    sample_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    result: Mapped[str] = mapped_column(String(16))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class PreannotationTask(Base):
    __tablename__ = "preannotation_task"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    dataset_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("dataset.id"))
    kind: Mapped[str] = mapped_column(String(32))  # text | vision
    model_version_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    params_json: Mapped[dict | None] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    progress: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class PreannotationResult(Base):
    __tablename__ = "preannotation_result"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("preannotation_task.id"))
    sample_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    title: Mapped[str] = mapped_column(String(256), default="")
    kind: Mapped[str] = mapped_column(String(32))
    model_payload: Mapped[dict | None] = mapped_column(JSON, default=dict)
    human_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    diff_json: Mapped[list | None] = mapped_column(JSON, default=list)
    conf: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="predicted")
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    meta_json: Mapped[dict | None] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class VlaScene(Base):
    __tablename__ = "vla_scene"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    category: Mapped[str] = mapped_column(String(64), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    image_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    tags_json: Mapped[list | None] = mapped_column(JSON, default=list)
    constraints_json: Mapped[dict | None] = mapped_column(JSON, default=dict)


class CollectionPlan(Base):
    __tablename__ = "collection_plan"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    steps_json: Mapped[list | None] = mapped_column(JSON, default=list)
    data_types: Mapped[list | None] = mapped_column(JSON, default=list)
    frequency_hz: Mapped[float] = mapped_column(Float, default=10)
    duration_sec: Mapped[int] = mapped_column(Integer, default=60)
    quality_req: Mapped[str] = mapped_column(Text, default="")


class ActionTemplate(Base):
    __tablename__ = "action_template"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    type: Mapped[str] = mapped_column(String(64), default="")
    steps_json: Mapped[list | None] = mapped_column(JSON, default=list)
    start_cond: Mapped[str] = mapped_column(Text, default="")
    end_cond: Mapped[str] = mapped_column(Text, default="")


class VlaTask(Base):
    __tablename__ = "vla_task"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("project.id"))
    name: Mapped[str] = mapped_column(String(256))
    scene_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("vla_scene.id"))
    plan_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("collection_plan.id"))
    mode: Mapped[str] = mapped_column(String(64), default="multimodal_sync")
    robot_model: Mapped[str] = mapped_column(String(64), default="")
    device_no: Mapped[str] = mapped_column(String(64), default="")
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    instruction: Mapped[str] = mapped_column(Text, default="")
    scene: Mapped[str] = mapped_column(String(128), default="")
    plan: Mapped[str] = mapped_column(String(128), default="")
    personnel_ids: Mapped[list | None] = mapped_column(JSON, default=list)
    action_template_ids: Mapped[list | None] = mapped_column(JSON, default=list)
    video_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    duration_sec: Mapped[float] = mapped_column(Float, default=0)
    total_frames: Mapped[int] = mapped_column(Integer, default=0)
    annotation_json: Mapped[dict | None] = mapped_column(JSON, default=dict)
    issues_json: Mapped[list | None] = mapped_column(JSON, default=list)
    issues_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    filtered_out: Mapped[list | None] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class ActionSequence(Base):
    __tablename__ = "action_sequence"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    vla_task_id: Mapped[str] = mapped_column(String(64), ForeignKey("vla_task.id"), index=True)
    sample_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    order_no: Mapped[int] = mapped_column(Integer, default=0)
    action_type: Mapped[str] = mapped_column(String(64), default="")
    start_ts: Mapped[float] = mapped_column(Float, default=0)
    end_ts: Mapped[float] = mapped_column(Float, default=0)
    start_frame: Mapped[int] = mapped_column(Integer, default=0)
    end_frame: Mapped[int] = mapped_column(Integer, default=0)
    desc: Mapped[str] = mapped_column(Text, default="")


class ActionNode(Base):
    __tablename__ = "action_node"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    sequence_id: Mapped[str] = mapped_column(String(64), ForeignKey("action_sequence.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    type: Mapped[str] = mapped_column(String(64), default="")
    timestamp: Mapped[float] = mapped_column(Float, default=0)
    frame_idx: Mapped[int] = mapped_column(Integer, default=0)
    image_file_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    labels_json: Mapped[dict | None] = mapped_column(JSON, default=dict)


class ModalityRelation(Base):
    __tablename__ = "modality_relation"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    sample_id: Mapped[str] = mapped_column(String(64), index=True)
    video_file_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    image_file_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    text_ref: Mapped[str | None] = mapped_column(Text, nullable=True)
    instruction: Mapped[str | None] = mapped_column(Text, nullable=True)
    seq_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    node_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    timestamp: Mapped[float] = mapped_column(Float, default=0)


class VlaQualityTask(Base):
    __tablename__ = "vla_quality_task"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    vla_task_id: Mapped[str] = mapped_column(String(64), ForeignKey("vla_task.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    detectors_json: Mapped[list | None] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class VlaQualityResult(Base):
    __tablename__ = "vla_quality_result"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    quality_task_id: Mapped[str] = mapped_column(String(64), ForeignKey("vla_quality_task.id"), index=True)
    sample_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    issue_type: Mapped[str] = mapped_column(String(64))
    severity: Mapped[str] = mapped_column(String(16), default="medium")
    location_json: Mapped[dict | None] = mapped_column(JSON, default=dict)
    message: Mapped[str] = mapped_column(Text, default="")
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    review_decision: Mapped[str | None] = mapped_column(String(32), nullable=True)


class Algorithm(Base):
    __tablename__ = "algorithm"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    type: Mapped[str] = mapped_column(String(64))
    framework: Mapped[str] = mapped_column(String(64), default="pytorch")
    entrypoint: Mapped[str] = mapped_column(String(256), default="")
    env: Mapped[str] = mapped_column(String(128), default="")


class AlgorithmVersion(Base):
    __tablename__ = "algorithm_version"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    algorithm_id: Mapped[str] = mapped_column(String(64), ForeignKey("algorithm.id"))
    version: Mapped[str] = mapped_column(String(32))
    changelog: Mapped[str] = mapped_column(Text, default="")
    image_ref: Mapped[str] = mapped_column(String(256), default="")
    status: Mapped[str] = mapped_column(String(32), default="active")


class Model(Base):
    __tablename__ = "model"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    algorithm_id: Mapped[str] = mapped_column(String(64), ForeignKey("algorithm.id"))


class ModelVersion(Base):
    __tablename__ = "model_version"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    model_id: Mapped[str] = mapped_column(String(64), ForeignKey("model.id"))
    version: Mapped[str] = mapped_column(String(32))
    weights_path: Mapped[str] = mapped_column(String(512), default="")
    config_path: Mapped[str] = mapped_column(String(512), default="")
    status: Mapped[str] = mapped_column(String(32), default="ready")


class TrainingTask(Base):
    __tablename__ = "training_task"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(256))
    algorithm: Mapped[str] = mapped_column(String(64))
    version: Mapped[str] = mapped_column(String(32), default="v1")
    model: Mapped[str] = mapped_column(String(64), default="")
    dataset_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="created", index=True)
    priority: Mapped[str] = mapped_column(String(16), default="normal")
    current_epoch: Mapped[int] = mapped_column(Integer, default=0)
    gpu_ids: Mapped[list | None] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class TrainingConfig(Base):
    __tablename__ = "training_config"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(64), ForeignKey("training_task.id"), unique=True)
    epochs: Mapped[int] = mapped_column(Integer, default=10)
    batch_size: Mapped[int] = mapped_column(Integer, default=8)
    lr: Mapped[float] = mapped_column(Float, default=1e-3)
    optimizer: Mapped[str] = mapped_column(String(32), default="adam")
    input_size: Mapped[int] = mapped_column(Integer, default=224)
    augment_json: Mapped[list | None] = mapped_column(JSON, default=list)
    device: Mapped[str] = mapped_column(String(32), default="cpu")


class TrainingMetrics(Base):
    __tablename__ = "training_metrics"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    task_id: Mapped[str] = mapped_column(String(64), ForeignKey("training_task.id"), index=True)
    epoch: Mapped[int] = mapped_column(Integer)
    train_loss: Mapped[float] = mapped_column(Float)
    val_loss: Mapped[float] = mapped_column(Float)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    precision: Mapped[float | None] = mapped_column(Float, nullable=True)
    recall: Mapped[float | None] = mapped_column(Float, nullable=True)
    map_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    map_metric: Mapped[str] = mapped_column(String(64), default="mAP@0.5")
    lr: Mapped[float | None] = mapped_column(Float, nullable=True)
    elapsed_sec: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class GpuResource(Base):
    __tablename__ = "gpu_resource"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(64))
    model: Mapped[str] = mapped_column(String(64))
    memory_mb: Mapped[int] = mapped_column(Integer, default=8192)
    util: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(32), default="free")
    free: Mapped[bool] = mapped_column(Boolean, default=True)


class GpuAllocation(Base):
    __tablename__ = "gpu_allocation"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    gpu_id: Mapped[str] = mapped_column(String(64), ForeignKey("gpu_resource.id"))
    training_task_id: Mapped[str] = mapped_column(String(64), ForeignKey("training_task.id"))
    allocated_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    released_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ExportTask(Base):
    __tablename__ = "export_task"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    biz_type: Mapped[str] = mapped_column(String(64))
    biz_id: Mapped[str] = mapped_column(String(64), index=True)
    format: Mapped[str] = mapped_column(String(16))
    path: Mapped[str] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(32), default="done")
    actor_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("user.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class OperationLog(Base):
    __tablename__ = "operation_log"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    actor_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("user.id"))
    actor_name: Mapped[str] = mapped_column(String(64), default="")
    action: Mapped[str] = mapped_column(String(128))
    detail: Mapped[str] = mapped_column(Text, default="")
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
