from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# 演示种子用户（后续改 DB + 密码哈希）
USERS = {
    "annotator": {"password": "annotator", "role": "annotator", "name": "标注员-艾达"},
    "reviewer": {"password": "reviewer", "role": "reviewer", "name": "审核员-芮雯"},
    "admin": {"password": "admin", "role": "admin", "name": "管理员-安卓"},
}


class LoginBody(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
def login(body: LoginBody):
    user = USERS.get(body.username)
    if not user or user["password"] != body.password:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    # 演示 token；后续换 JWT
    token = f"eide-demo-token-{body.username}"
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": f"u-{body.username}",
            "username": body.username,
            "name": user["name"],
            "role": user["role"],
        },
    }


@router.get("/auth/me")
def me():
    return {
        "id": "u-admin",
        "username": "admin",
        "name": "管理员-安卓",
        "role": "admin",
        "note": "未解析 Authorization 时的演示回落；接 JWT 后删除",
    }
