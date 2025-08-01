import React, { useEffect, useState, useMemo } from 'react';
import './App.css';
import WebApp from '@twa-dev/sdk';

const tg = WebApp;
tg.ready();
tg.expand();

const API_URL = 'http://127.0.0.1:8000';

function getUserIdFromTelegram(): number {
  try {
    // Попытка получить user_id из Telegram WebApp initDataUnsafe
    // @ts-ignore
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser && tgUser.id) return tgUser.id;
    // @ts-ignore
    if (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id) return tg.initDataUnsafe.user.id;
  } catch {}
  return 1; // fallback для локального теста
}

const USER_ID = getUserIdFromTelegram();

type Upgrade = {
  name: string;
  cost: number;
  desc: string;
};

function getSmokePerClick(upgrades: string[]): number {
  let base = 1;
  if (upgrades.includes('🔥 Уголь получше')) base += 1;
  if (upgrades.includes('🍏 Яблочный табак')) base += 3;
  return base;
}

function App() {
  const [smoke, setSmoke] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [upgrades, setUpgrades] = useState<string[]>([]);
  const [shopItems, setShopItems] = useState<Upgrade[]>([]);
  const [loading, setLoading] = useState(true);

  const smokePerClick = useMemo(() => getSmokePerClick(upgrades), [upgrades]);

  // Получить данные пользователя и апгрейды
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const userRes = await fetch(`${API_URL}/user/${USER_ID}`);
      const user = await userRes.json();
      setSmoke(user.smoke);
      setUpgrades(user.upgrades ? user.upgrades.split(',') : []);
      const shopRes = await fetch(`${API_URL}/shop`);
      const shop = await shopRes.json();
      setShopItems(shop);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Автокальян: если куплен, каждую минуту +1 дым
  useEffect(() => {
    if (!upgrades.includes('🤖 Автокальян')) return;
    const interval = setInterval(() => {
      setSmoke(prev => {
        const newSmoke = prev + 1;
        fetch(`${API_URL}/user/smoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: USER_ID, smoke: newSmoke })
        });
        return newSmoke;
      });
    }, 60000); // 1 минута
    return () => clearInterval(interval);
  }, [upgrades]);

  // Кликер: увеличить дым и отправить на backend
  const handleSmoke = async () => {
    const newSmoke = smoke + smokePerClick;
    setSmoke(newSmoke);
    tg.HapticFeedback?.impactOccurred('medium');
    await fetch(`${API_URL}/user/smoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: USER_ID, smoke: newSmoke })
    });
  };

  // Покупка апгрейда
  const handleBuy = async (idx: number) => {
    const res = await fetch(`${API_URL}/shop/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: USER_ID, upgrade_idx: idx })
    });
    if (res.ok) {
      // Обновить данные
      const userRes = await fetch(`${API_URL}/user/${USER_ID}`);
      const user = await userRes.json();
      setSmoke(user.smoke);
      setUpgrades(user.upgrades ? user.upgrades.split(',') : []);
    } else {
      const err = await res.json();
      alert(err.detail || 'Ошибка покупки');
    }
  };

  return (
    <div className="App">
      <header className="header">
        <span role="img" aria-label="hookah" style={{fontSize: 32}}>💨</span>
        <h1>Кальян Кликер</h1>
      </header>
      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <>
          <div className="counter-block">
            <div className="smoke-count">{smoke} <span role="img" aria-label="smoke">💨</span></div>
            <button className="smoke-btn" onClick={handleSmoke}>
              Курить кальян (+{smokePerClick})
            </button>
          </div>
          <button className="shop-btn" onClick={() => setShopOpen(true)}>
            🛒 Магазин
          </button>
          {shopOpen && (
            <div className="shop-modal">
              <div className="shop-content">
                <h2>Магазин апгрейдов</h2>
                <ul>
                  {shopItems.map((item, idx) => (
                    <li key={item.name} style={{marginBottom: 8}}>
                      <b>{item.name}</b> — {item.cost}💨<br/>
                      <i>{item.desc}</i><br/>
                      {upgrades.includes(item.name) ? (
                        <span style={{color: 'green'}}>Куплено ✅</span>
                      ) : (
                        <button onClick={() => handleBuy(idx)} disabled={smoke < item.cost}>
                          Купить
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setShopOpen(false)}>Закрыть</button>
              </div>
            </div>
          )}
        </>
      )}
      <footer className="footer">
        <span>by Hookah Clicker</span>
      </footer>
    </div>
  );
}

export default App;
