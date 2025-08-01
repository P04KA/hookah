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

function getHookahBonus(name: string): number {
  if (name === 'Alpha Hookah') return 2;
  if (name === 'Xhoob') return 4;
  if (name === 'Maklaud') return 7;
  return 0;
}
function getTobaccoBonus(name: string, level: number): number {
  if (name === 'Darkside') return level * 1;
  if (name === 'Musthave') return level * 1.5;
  return 0;
}

// Пример фоток (можно заменить на свои)
const HOOKAHS = [
  { name: 'Alpha Hookah', img: 'https://cdn.hookahmarket.ru/upload/resize_cache/iblock/1e2/400_400_1/1e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e.jpg', cost: 100, bonus: '+2 дыма за клик' },
  { name: 'Xhoob', img: 'https://cdn.hookahmarket.ru/upload/resize_cache/iblock/2b2/400_400_1/2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b.jpg', cost: 200, bonus: '+4 дыма за клик' },
  { name: 'Maklaud', img: 'https://cdn.hookahmarket.ru/upload/resize_cache/iblock/3c3/400_400_1/3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c.jpg', cost: 350, bonus: '+7 дыма за клик' },
];
const TOBACCOS = [
  { name: 'Darkside', img: 'https://cdn.hookahmarket.ru/upload/resize_cache/iblock/4d4/400_400_1/4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d.jpg', baseCost: 30, bonus: '+1 дым за клик за уровень', maxLevel: 5 },
  { name: 'Musthave', img: 'https://cdn.hookahmarket.ru/upload/resize_cache/iblock/5e5/400_400_1/5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e.jpg', baseCost: 40, bonus: '+1.5 дыма за клик за уровень', maxLevel: 5 },
];

function App() {
  const [smoke, setSmoke] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);
  const [upgrades, setUpgrades] = useState<string[]>([]);
  const [shopItems, setShopItems] = useState<Upgrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [smokeAnims, setSmokeAnims] = useState<number[]>([]);
  const [shopTab, setShopTab] = useState<'hookahs'|'tobaccos'|'upgrades'>('hookahs');
  const [ownedHookahs, setOwnedHookahs] = useState<string[]>([]);
  const [activeHookah, setActiveHookah] = useState<string>('Alpha Hookah');
  const [tobaccoLevels, setTobaccoLevels] = useState<{[name:string]:number}>({});
  const [profileOpen, setProfileOpen] = useState(false);

  const smokePerClick = useMemo(() => {
    let base = 1;
    base += getHookahBonus(activeHookah);
    for (const t of TOBACCOS) {
      base += getTobaccoBonus(t.name, tobaccoLevels[t.name] || 0);
    }
    if (upgrades.includes('🔥 Уголь получше')) base += 1;
    if (upgrades.includes('🍏 Яблочный табак')) base += 3;
    return base;
  }, [activeHookah, tobaccoLevels, upgrades]);

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

  // Кликер: увеличить дым и отправить на backend + анимация дыма
  const handleSmoke = async () => {
    const newSmoke = smoke + smokePerClick;
    setSmoke(newSmoke);
    tg.HapticFeedback?.impactOccurred('medium');
    // Добавить анимацию дыма
    setSmokeAnims(anims => [...anims, Date.now()]);
    setTimeout(() => {
      setSmokeAnims(anims => anims.slice(1));
    }, 1200);
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

  // Покупка кальяна
  const handleBuyHookah = (name: string) => {
    if (!ownedHookahs.includes(name)) {
      setOwnedHookahs([...ownedHookahs, name]);
      setActiveHookah(name);
    } else {
      setActiveHookah(name);
    }
  };
  // Прокачка табака
  const handleUpgradeTobacco = (name: string) => {
    setTobaccoLevels(levels => {
      const lvl = (levels[name] || 0) + 1;
      return { ...levels, [name]: lvl };
    });
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
          <div className="counter-block" style={{position: 'relative', minHeight: 120}}>
            <div className="smoke-count">{smoke} <span role="img" aria-label="smoke">💨</span></div>
            <button className="smoke-btn" onClick={handleSmoke}>
              Курить кальян (+{smokePerClick})
            </button>
            {smokeAnims.map((id, i) => (
              <svg key={id} className="smoke-anim" width="48" height="48" viewBox="0 0 48 48">
                <ellipse cx="24" cy="24" rx="16" ry="10" fill="white" opacity="0.7"/>
                <ellipse cx="32" cy="18" rx="8" ry="6" fill="white" opacity="0.5"/>
                <ellipse cx="16" cy="20" rx="7" ry="5" fill="white" opacity="0.4"/>
              </svg>
            ))}
          </div>
          <button className="shop-btn" onClick={() => setShopOpen(true)}>
            🛒 Магазин
          </button>
          {shopOpen && (
            <div className="shop-modal">
              <div className="shop-content">
                <div style={{display:'flex', gap:8, justifyContent:'center', marginBottom:16}}>
                  <button onClick={()=>setShopTab('hookahs')} style={{fontWeight:shopTab==='hookahs'?'bold':'normal'}}>Кальяны</button>
                  <button onClick={()=>setShopTab('tobaccos')} style={{fontWeight:shopTab==='tobaccos'?'bold':'normal'}}>Табаки</button>
                  <button onClick={()=>setShopTab('upgrades')} style={{fontWeight:shopTab==='upgrades'?'bold':'normal'}}>Апгрейды</button>
                </div>
                {shopTab==='hookahs' && (
                  <div>
                    <h2>Кальяны</h2>
                    <div style={{display:'flex',flexWrap:'wrap',gap:16,justifyContent:'center'}}>
                      {HOOKAHS.map(h=>
                        <div key={h.name} style={{background:'#333',borderRadius:16,padding:12,minWidth:180,maxWidth:200}}>
                          <img src={h.img} alt={h.name} style={{width:120,height:120,objectFit:'cover',borderRadius:12,marginBottom:8}}/>
                          <div style={{fontWeight:'bold',fontSize:18}}>{h.name}</div>
                          <div style={{fontSize:14,opacity:0.8}}>{h.bonus}</div>
                          <div style={{margin:'8px 0'}}>{h.cost}💨</div>
                          {ownedHookahs.includes(h.name) ? (
                            <button disabled style={{background:'#222',color:'#0f0'}}>Куплено</button>
                          ) : (
                            <button onClick={()=>handleBuyHookah(h.name)} disabled={smoke<h.cost}>Купить</button>
                          )}
                          {ownedHookahs.includes(h.name) && activeHookah!==h.name && (
                            <button onClick={()=>setActiveHookah(h.name)} style={{marginTop:4}}>Сделать активным</button>
                          )}
                          {activeHookah===h.name && <div style={{color:'#ffcc33',marginTop:4}}>Активный</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {shopTab==='tobaccos' && (
                  <div>
                    <h2>Табаки</h2>
                    <div style={{display:'flex',flexWrap:'wrap',gap:16,justifyContent:'center'}}>
                      {TOBACCOS.map(t=>
                        <div key={t.name} style={{background:'#333',borderRadius:16,padding:12,minWidth:180,maxWidth:200}}>
                          <img src={t.img} alt={t.name} style={{width:120,height:120,objectFit:'cover',borderRadius:12,marginBottom:8}}/>
                          <div style={{fontWeight:'bold',fontSize:18}}>{t.name}</div>
                          <div style={{fontSize:14,opacity:0.8}}>{t.bonus}</div>
                          <div>Уровень: {tobaccoLevels[t.name]||0} / {t.maxLevel}</div>
                          <div style={{margin:'8px 0'}}>{t.baseCost*((tobaccoLevels[t.name]||0)+1)}💨</div>
                          <button onClick={()=>handleUpgradeTobacco(t.name)} disabled={smoke<t.baseCost*((tobaccoLevels[t.name]||0)+1) || (tobaccoLevels[t.name]||0)>=t.maxLevel}>
                            { (tobaccoLevels[t.name]||0)>=t.maxLevel ? 'Макс. уровень' : 'Прокачать' }
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {shopTab==='upgrades' && (
                  <div>
                    <h2>Апгрейды</h2>
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
                  </div>
                )}
                <button onClick={() => setShopOpen(false)}>Закрыть</button>
              </div>
            </div>
          )}
          <button className="shop-btn" onClick={()=>setProfileOpen(true)} style={{marginTop:8,marginBottom:0}}>👤 Профиль</button>
          {profileOpen && (
            <div className="shop-modal">
              <div className="shop-content">
                <h2>Профиль</h2>
                <div style={{marginBottom:12}}>
                  <b>Дым:</b> {smoke} 💨
                </div>
                <div style={{marginBottom:12}}>
                  <b>Активный кальян:</b><br/>
                  <img src={HOOKAHS.find(h=>h.name===activeHookah)?.img} alt={activeHookah} style={{width:80,height:80,borderRadius:12,margin:'8px 0'}}/><br/>
                  <span>{activeHookah}</span>
                </div>
                <div style={{marginBottom:12}}>
                  <b>Купленные кальяны:</b><br/>
                  {ownedHookahs.length===0 ? 'Нет' : ownedHookahs.map(h=>
                    <img key={h} src={HOOKAHS.find(hh=>hh.name===h)?.img} alt={h} style={{width:40,height:40,borderRadius:8,margin:'0 4px'}}/>
                  )}
                </div>
                <div style={{marginBottom:12}}>
                  <b>Табаки:</b><br/>
                  {TOBACCOS.map(t=>(
                    <span key={t.name} style={{marginRight:8}}>
                      <img src={t.img} alt={t.name} style={{width:32,height:32,borderRadius:6,verticalAlign:'middle'}}/> {t.name}: {tobaccoLevels[t.name]||0}
                    </span>
                  ))}
                </div>
                <div style={{marginBottom:12}}>
                  <b>Апгрейды:</b><br/>
                  {upgrades.length===0 ? 'Нет' : upgrades.join(', ')}
                </div>
                <button onClick={()=>setProfileOpen(false)}>Закрыть</button>
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
