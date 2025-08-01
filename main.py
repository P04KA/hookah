from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from backend_api import api_router

# --- aiogram imports ---
import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.filters import CommandStart

API_TOKEN = "7647115086:AAFvPXk0hdFQU9BqZLOlya5xMvj_aRgS8pA"  # <-- Вставь сюда свой токен
WEBAPP_URL = "https://your-webapp-url.com"  # <-- Замени на реальный url после деплоя

# --- FastAPI app ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

FRONTEND_BUILD_DIR = os.path.join(os.path.dirname(__file__), "webapp", "build")
app.mount("/", StaticFiles(directory=FRONTEND_BUILD_DIR, html=True), name="static")

# --- aiogram bot logic ---
dp = Dispatcher()

main_kb = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="💨 Курить кальян", callback_data="smoke")],
    [InlineKeyboardButton(text="🛒 Магазин", callback_data="shop")],
    [InlineKeyboardButton(text="👤 Профиль", callback_data="profile")],
])

@dp.message(CommandStart())
async def cmd_start(message: Message):
    await message.answer(
        "Добро пожаловать в <b>Кальян Кликер</b>!\n\nЖми на кнопку, чтобы курить кальян и зарабатывать дым!",
        reply_markup=main_kb,
        parse_mode="HTML"
    )

@dp.message(lambda m: m.text == "/webapp")
async def webapp_cmd(message: Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 Открыть кальян-кликер", web_app=WebAppInfo(url=WEBAPP_URL))]
    ])
    await message.answer("Запусти мини-приложение кальян-кликера!", reply_markup=kb)

# --- Background task for aiogram ---
async def start_bot():
    bot = Bot(token=API_TOKEN)
    await dp.start_polling(bot)

@app.on_event("startup")
def launch_bot():
    loop = asyncio.get_event_loop()
    loop.create_task(start_bot())