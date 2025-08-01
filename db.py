import aiosqlite

DB_PATH = 'hookah_clicker.db'

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

async def get_user(user_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute('SELECT smoke, upgrades FROM users WHERE user_id = ?', (user_id,))
        row = await cursor.fetchone()
        if row:
            return {'smoke': row[0], 'upgrades': row[1]}
        else:
            await db.execute('INSERT INTO users (user_id) VALUES (?)', (user_id,))
            await db.commit()
            return {'smoke': 0, 'upgrades': ''}

async def update_smoke(user_id: int, amount: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('UPDATE users SET smoke = smoke + ? WHERE user_id = ?', (amount, user_id))
        await db.commit()

async def set_upgrades(user_id: int, upgrades: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('UPDATE users SET upgrades = ? WHERE user_id = ?', (upgrades, user_id))
        await db.commit() 