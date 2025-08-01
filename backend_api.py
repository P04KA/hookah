from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import aiosqlite
from typing import List

DB_PATH = 'hookah_clicker.db'

api_router = APIRouter()

class UserSmoke(BaseModel):
    user_id: int
    smoke: int

class UpgradeBuy(BaseModel):
    user_id: int
    upgrade_idx: int

UPGRADES = [
    {"name": "🔥 Уголь получше", "cost": 10, "desc": "+1 дым за клик"},
    {"name": "🍏 Яблочный табак", "cost": 30, "desc": "+3 дыма за клик"},
    {"name": "🤖 Автокальян", "cost": 100, "desc": "+1 дым в минуту"},
]

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                smoke INTEGER DEFAULT 0,
                upgrades TEXT DEFAULT ''
            )
        ''')
        await db.commit()

@api_router.on_event("startup")
async def on_startup():
    await init_db()

@api_router.get("/user/{user_id}")
async def get_user(user_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute('SELECT smoke, upgrades FROM users WHERE user_id = ?', (user_id,))
        row = await cursor.fetchone()
        if row:
            return {"smoke": row[0], "upgrades": row[1]}
        else:
            await db.execute('INSERT INTO users (user_id) VALUES (?)', (user_id,))
            await db.commit()
            return {"smoke": 0, "upgrades": ''}

@api_router.post("/user/smoke")
async def add_smoke(data: UserSmoke):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('UPDATE users SET smoke = ? WHERE user_id = ?', (data.smoke, data.user_id))
        await db.commit()
    return {"ok": True}

@api_router.get("/shop")
async def get_shop():
    return UPGRADES

@api_router.post("/shop/buy")
async def buy_upgrade(data: UpgradeBuy):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute('SELECT smoke, upgrades FROM users WHERE user_id = ?', (data.user_id,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "User not found")
        smoke, upgrades = row[0], row[1]
        upgrades_list = upgrades.split(',') if upgrades else []
        if data.upgrade_idx < 0 or data.upgrade_idx >= len(UPGRADES):
            raise HTTPException(400, "No such upgrade")
        upgrade = UPGRADES[data.upgrade_idx]
        if upgrade['name'] in upgrades_list:
            raise HTTPException(400, "Already owned")
        if smoke < upgrade['cost']:
            raise HTTPException(400, "Not enough smoke")
        upgrades_list.append(upgrade['name'])
        new_upgrades = ','.join(upgrades_list)
        new_smoke = smoke - upgrade['cost']
        await db.execute('UPDATE users SET smoke = ?, upgrades = ? WHERE user_id = ?', (new_smoke, new_upgrades, data.user_id))
        await db.commit()
    return {"ok": True, "upgrade": upgrade['name']} 