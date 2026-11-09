"""Initialize schema and demo seed data."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.db import Base, SessionLocal, engine
from app.models import (
    ActionTemplate,
    Algorithm,
    AlgorithmVersion,
    AnnotationTask,
    CollectionPlan,
    Dataset,
    GpuResource,
    Model,
    ModelVersion,
    Organization,
    PreannotationResult,
    Project,
    QualityRule,
    Role,
    User,
    UserRole,
    VlaScene,
    VlaTask,
)
from app.security import hash_password


def seed_all() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.get(User, "u-admin"):
            return
        _seed(db)
        db.commit()
    finally:
        db.close()


def _seed(db: Session) -> None:
    db.add(Organization(id="org-sc", name="星算云演示组织", parent_id=None))
    for rid, code, name in [
        ("role-admin", "admin", "管理员"),
        ("role-reviewer", "reviewer", "审核员"),
        ("role-annotator", "annotator", "标注员"),
    ]:
        db.add(Role(id=rid, code=code, name=name))

    users = [
        ("u-admin", "admin", "管理员", "role-admin"),
        ("u-reviewer", "reviewer", "审核员", "role-reviewer"),
        ("u-annotator", "annotator", "标注员", "role-annotator"),
    ]
    for uid, username, name, role_id in users:
        db.add(
            User(
                id=uid,
                username=username,
                password_hash=hash_password("admin123" if username == "admin" else f"{username}123"),
                name=name,
                org_id="org-sc",
            )
        )
        db.add(UserRole(user_id=uid, role_id=role_id))

    db.add(Project(id="proj-sc-01", name="具身抓取标注项目", code="SC-PROJ-01", owner_id="u-admin"))
    db.add(
        Dataset(
            id="ds-sc-01",
            project_id="proj-sc-01",
            name="桌面抓取多模态集",
            modality="multimodal",
            version="v1",
        )
    )

    db.add(
        AnnotationTask(
            id="SC-2026-1109-0001",
            project_id="proj-sc-01",
            dataset_id="ds-sc-01",
            title="客服工单 NER 样例",
            modality="text_ner",
            status="assigned",
            priority="A",
            assignee_id="u-annotator",
            creator_id="u-admin",
            sample_count=1,
            collaborators=["u-annotator"],
            labels_snapshot=[
                {"id": "e1", "text": "张某", "type": "PERSON", "start": 2, "end": 4},
            ],
            resource_json={
                "id": "res-text-01",
                "title": "客服工单原文-脱敏",
                "text": "用户张某于2026年10月28日致电反映：订单 SC-ORD-8821 物流延误。",
                "labelSet": ["PERSON", "DATE", "ORDER_ID", "ADDRESS", "PHONE", "ORG"],
            },
        )
    )

    db.add(
        QualityRule(
            id="qr-01",
            name="默认随机抽检 10%",
            ratio=0.1,
            modalities_json=["text_ner", "seg", "audio_slice", "video_det", "point_seg"],
            threshold=0.9,
            enabled=True,
        )
    )

    db.add(
        PreannotationResult(
            id="pre-text-01",
            title="物流投诉工单",
            kind="text",
            status="predicted",
            model_payload={
                "classification": {"label": "物流投诉", "conf": 0.86},
                "entities": [{"text": "张某", "type": "PERSON", "start": 2, "end": 4, "conf": 0.91}],
                "relations": [],
                "model_version": "lite-nlp-0.1",
            },
            meta_json={"text": "用户张某反映订单延误，请求改派。"},
        )
    )
    db.add(
        PreannotationResult(
            id="pre-vision-01",
            title="桌面抓取图",
            kind="vision",
            status="predicted",
            model_payload={"ocr": [], "yolo": []},
            meta_json={"image_path": ""},
        )
    )

    db.add(VlaScene(id="scene-desk", name="桌面抓取", category="manipulation", description="桌面杯盘抓取"))
    db.add(
        CollectionPlan(
            id="plan-std",
            name="标准多模态采集",
            steps_json=["校准", "示范", "回放"],
            data_types=["video", "image", "joint"],
            frequency_hz=30,
            duration_sec=90,
            quality_req="无严重模糊/遮挡",
        )
    )
    db.add(
        ActionTemplate(
            id="tpl-pick",
            name="抓取放置",
            type="pick_place",
            steps_json=["接近", "闭合夹爪", "抬起", "放置"],
            start_cond="目标可见",
            end_cond="放置完成",
        )
    )
    db.add(
        VlaTask(
            id="SC-VLA-0001",
            project_id="proj-sc-01",
            name="桌面抓杯示范",
            scene_id="scene-desk",
            plan_id="plan-std",
            mode="demo_teleop",
            robot_model="Unitree",
            device_no="DEV-01",
            status="annotating",
            instruction="请抓起桌上的杯子并放到盘子左侧",
            scene="桌面抓取",
            plan="标准多模态采集",
            personnel_ids=["u-annotator"],
            action_template_ids=["tpl-pick"],
            video_url="/samples/video/bin_pick.mp4",
            image_url="/samples/images/desk_seg.jpg",
            duration_sec=8,
            total_frames=240,
            annotation_json={
                "actions": [
                    {
                        "id": "a1",
                        "type": "reach",
                        "start": 0.5,
                        "end": 2.0,
                        "startFrame": 15,
                        "endFrame": 60,
                        "desc": "接近杯子",
                    }
                ],
                "nodes": [{"id": "n1", "name": "接触瞬间", "type": "key", "timestamp": 1.8, "frame": 54}],
            },
        )
    )

    db.add(Algorithm(id="algo-yolo", name="检测 YOLO 微调", type="detection", framework="pytorch", entrypoint="train_yolo.py"))
    db.add(AlgorithmVersion(id="algo-yolo-v8", algorithm_id="algo-yolo", version="v8.2", changelog="baseline"))
    db.add(Model(id="model-yolov8n", name="yolov8n", algorithm_id="algo-yolo"))
    db.add(ModelVersion(id="mv-yolov8n", model_id="model-yolov8n", version="8.2.0", weights_path="models/yolov8n.pt"))

    for i, (gid, name, mem) in enumerate(
        [("gpu-0", "CUDA:0", 24576), ("gpu-1", "CUDA:1", 24576), ("gpu-cpu", "CPU", 0)],
        start=0,
    ):
        db.add(
            GpuResource(
                id=gid,
                name=name,
                model="RTX" if i < 2 else "CPU",
                memory_mb=mem,
                util=0,
                status="free",
                free=True,
            )
        )
