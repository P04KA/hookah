from db import get_user, update_smoke, set_upgrades

UPGRADES = [
    {"name": "🔥 Уголь получше", "cost": 10, "desc": "+1 дым за клик"},
    {"name": "🍏 Яблочный табак", "cost": 30, "desc": "+3 дыма за клик"},
    {"name": "🤖 Автокальян", "cost": 100, "desc": "+1 дым в минуту"},
]

def get_shop_items():
    return UPGRADES

async def buy_upgrade(user_id: int, upgrade_idx: int):
    user = await get_user(user_id)
    upgrades = user['upgrades'].split(',') if user['upgrades'] else []
    if upgrade_idx < 0 or upgrade_idx >= len(UPGRADES):
        return False, "Такого апгрейда нет!"
    upgrade = UPGRADES[upgrade_idx]
    if upgrade['name'] in upgrades:
        return False, "У тебя уже есть этот апгрейд!"
    if user['smoke'] < upgrade['cost']:
        return False, "Недостаточно дыма!"
    upgrades.append(upgrade['name'])
    await update_smoke(user_id, -upgrade['cost'])
    await set_upgrades(user_id, ','.join(upgrades))
    return True, f"Поздравляем! Ты купил: {upgrade['name']}" 