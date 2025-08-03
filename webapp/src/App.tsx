import React, { useEffect, useState, useMemo } from 'react';
import './App.css';
import WebApp from '@twa-dev/sdk';

const tg = WebApp;
tg.ready();
tg.expand();

const API_URL = "https://hookah-pe44ka.amvera.io/api";

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

// SVG/PNG картинки (работающие)
const HOOKAHS = [
  { name: 'Alpha Hookah', img: 'https://cdn.jsdelivr.net/gh/tabler/tabler-icons/icons/hookah.svg', cost: 100, bonus: '+2 дыма за клик' },
  { name: 'Xhoob', img: 'https://cdn.jsdelivr.net/gh/tabler/tabler-icons/icons/brand-xing.svg', cost: 200, bonus: '+4 дыма за клик' },
  { name: 'Maklaud', img: 'https://cdn.jsdelivr.net/gh/tabler/tabler-icons/icons/brand-mastercard.svg', cost: 350, bonus: '+7 дыма за клик' },
  { name: 'Khalil Mamoon', img: 'https://cdn.jsdelivr.net/gh/tabler/tabler-icons/icons/brand-hipchat.svg', cost: 500, bonus: '+12 дыма за клик' },
  { name: 'Union Hookah', img: 'https://cdn.jsdelivr.net/gh/tabler/tabler-icons/icons/brand-unity.svg', cost: 700, bonus: '+18 дыма за клик' },
];
const TOBACCOS = [
  { name: 'Darkside', img: 'https://cdn.jsdelivr.net/gh/tabler/tabler-icons/icons/plant.svg', baseCost: 30, bonus: '+1 дым за клик за уровень', maxLevel: 5 },
  { name: 'Musthave', img: 'https://cdn.jsdelivr.net/gh/tabler/tabler-icons/icons/plant-2.svg', baseCost: 40, bonus: '+1.5 дыма за клик за уровень', maxLevel: 5 },
  { name: 'Tangiers', img: 'https://cdn.jsdelivr.net/gh/tabler/tabler-icons/icons/plant-3.svg', baseCost: 60, bonus: '+2 дыма за клик за уровень', maxLevel: 5 },
];
const ACHIEVEMENTS = [
  { icon: '🥇', label: 'Первый дым', check: (smoke:number)=>smoke>=1 },
  { icon: '🔥', label: '100 дыма', check: (smoke:number)=>smoke>=100 },
  { icon: '💎', label: 'Кальян-мастер', check: (smoke:number, ownedHookahs:string[])=>ownedHookahs.length>=3 },
  { icon: '🌬️', label: 'Дымный бог', check: (smoke:number)=>smoke>=1000 },
];
const TOP_PLAYERS = [
  { name: 'P04KA', score: 9999 },
  { name: 'SmokeKing', score: 8888 },
  { name: 'AlphaUser', score: 7777 },
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
  const [glowCard, setGlowCard] = useState<string|null>(null);

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

  // Покупка кальяна с анимацией
  const handleBuyHookah = (name: string) => {
    if (!ownedHookahs.includes(name)) {
      setOwnedHookahs([...ownedHookahs, name]);
      setActiveHookah(name);
      setGlowCard('hookah-'+name);
      setTimeout(()=>setGlowCard(null), 900);
    } else {
      setActiveHookah(name);
    }
  };
  // Прокачка табака с анимацией
  const handleUpgradeTobacco = (name: string) => {
    setTobaccoLevels(levels => {
      const lvl = (levels[name] || 0) + 1;
      setGlowCard('tobacco-'+name);
      setTimeout(()=>setGlowCard(null), 900);
      return { ...levels, [name]: lvl };
    });
  };

  return (
    <div className="App">
      <div className="bg-parallax"></div>
      <div className="bg-smoke">
        <svg className="bg-smoke-1" width="220" height="120" viewBox="0 0 220 120">
          <ellipse cx="110" cy="60" rx="90" ry="40" fill="#fff" />
          <ellipse cx="160" cy="40" rx="40" ry="20" fill="#fff" opacity="0.7"/>
          <ellipse cx="60" cy="80" rx="30" ry="15" fill="#fff" opacity="0.5"/>
        </svg>
        <svg className="bg-smoke-2" width="180" height="100" viewBox="0 0 180 100">
          <ellipse cx="90" cy="50" rx="70" ry="30" fill="#fff" />
          <ellipse cx="130" cy="30" rx="30" ry="12" fill="#fff" opacity="0.6"/>
        </svg>
        <svg className="bg-smoke-3" width="160" height="80" viewBox="0 0 160 80">
          <ellipse cx="80" cy="40" rx="60" ry="25" fill="#fff" />
        </svg>
        <svg className="bg-smoke-4" width="200" height="100" viewBox="0 0 200 100">
          <ellipse cx="100" cy="50" rx="80" ry="35" fill="#fff" />
        </svg>
        <svg className="bg-smoke-5" width="140" height="70" viewBox="0 0 140 70">
          <ellipse cx="70" cy="35" rx="60" ry="20" fill="#fff" />
        </svg>
      </div>
      <header className="header">
        <h1>Тяга</h1>
        <span role="img" aria-label="hookah" style={{fontSize: 'clamp(2rem, 6vw, 3.5rem)'}}>💨</span>
      </header>
      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <>
          <div className="counter-block" style={{position: 'relative', minHeight: 120}}>
            <div className="smoke-count">{smoke} <span role="img" aria-label="smoke">💨</span></div>
            <div className="balance-bar">
              <div className="balance-bar-inner" style={{width: Math.min(100, Math.sqrt(smoke)*10) + '%'}}></div>
            </div>
            <button className="smoke-btn" onClick={handleSmoke}>
              Курить кальян (+{smokePerClick})
            </button>
            {smokeAnims.map((id, i) => (
              <svg key={id} className="smoke-anim" width="48" height="48" viewBox="0 0 48 48" style={{left:`calc(50% + ${Math.sin(id%360)*10}px)`}}>
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
            <div className="shop-modal" style={{animation:'fadeIn 0.5s'}}>
              <div className="shop-content" style={{animation:'fadeInUp 0.7s', position:'relative'}}>
                <button className="shop-exit-btn" onClick={() => setShopOpen(false)} title="Выйти из магазина">✖️</button>
                <div className="shop-tabs">
                  <button onClick={()=>setShopTab('hookahs')} className={shopTab==='hookahs'?'active':''}>Кальяны</button>
                  <button onClick={()=>setShopTab('tobaccos')} className={shopTab==='tobaccos'?'active':''}>Табаки</button>
                  <button onClick={()=>setShopTab('upgrades')} className={shopTab==='upgrades'?'active':''}>Апгрейды</button>
                </div>
                {shopTab==='hookahs' && (
                  <div>
                    <h2>Кальяны</h2>
                    <div style={{display:'flex',flexWrap:'wrap',gap:16,justifyContent:'center'}}>
                      {HOOKAHS.map(h=>
                        <div key={h.name} className={`hookah-card${glowCard==='hookah-'+h.name?' glow':''}`}>
                          <img src={h.img} alt={h.name} />
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
                          {activeHookah===h.name && <div className="active-label">Активный</div>}
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
                        <div key={t.name} className={`tobacco-card${glowCard==='tobacco-'+t.name?' glow':''}`}>
                          <img src={t.img} alt={t.name} />
                          <div style={{fontWeight:'bold',fontSize:18}}>{t.name}</div>
                          <div style={{fontSize:14,opacity:0.8}}>{t.bonus}</div>
                          <div>Уровень: {tobaccoLevels[t.name]||0} / {t.maxLevel}</div>
                          <div className="tobacco-bar">
                            <div className="tobacco-bar-inner" style={{width: ((tobaccoLevels[t.name]||0)/t.maxLevel*100)+'%'}}></div>
                          </div>
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
              </div>
            </div>
          )}
          <button className="shop-btn" onClick={()=>setProfileOpen(true)} style={{marginTop:'clamp(0.7rem,2vw,1.2rem)',marginBottom:0}}>👤 Профиль</button>
          {profileOpen && (
            <div className="shop-modal" style={{animation:'fadeIn 0.5s'}}>
              <div className="shop-content" style={{animation:'fadeInUp 0.7s', position:'relative'}}>
                <button className="profile-exit-btn" onClick={()=>setProfileOpen(false)} title="Выйти из профиля">✖️</button>
                <h2>Профиль</h2>
                <div style={{marginBottom:12}}>
                  <b>Дым:</b> {smoke} 💨
                </div>
                <div className="achievements">
                  {ACHIEVEMENTS.filter(a=>a.check(smoke,ownedHookahs)).map(a=>(
                    <span className="achievement" key={a.label}>{a.icon} {a.label}</span>
                  ))}
                </div>
                <div style={{marginBottom:12,marginTop:18}}>
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
                <div className="top-players">
                  <div className="top-players-title">Топ игроков</div>
                  <ul className="top-players-list">
                    {TOP_PLAYERS.map((p,i)=>(
                      <li key={p.name}><span style={{fontWeight:'bold',color:'#ffcc33'}}>{i+1}.</span> {p.name} <span style={{color:'#888'}}>— {p.score}💨</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <footer className="footer">
        Made by <a href="https://t.me/P04KA" style={{color:'#ffcc33',textDecoration:'none',fontWeight:700}} target="_blank" rel="noopener noreferrer">@P04KA</a>
      </footer>
    </div>
  );
}

export default App;
