import React, { useEffect, useState, useMemo } from 'react';
import './App.css';
import WebApp from '@twa-dev/sdk';

declare global {
  interface Window {
    Telegram?: any;
  }
}

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

// Реальные картинки кальянов и табаков
const HOOKAHS = [
  { name: 'Alpha Hookah', img: './alpha_hookah.png', cost: 100, bonus: '+2 дыма за клик' },
  { name: 'Xhoob', img: 'https://pngimg.com/d/hookah_PNG6.png', cost: 200, bonus: '+4 дыма за клик' },
  { name: 'Maklaud', img: 'https://pngimg.com/d/hookah_PNG8.png', cost: 350, bonus: '+7 дыма за клик' },
  { name: 'Khalil Mamoon', img: 'https://pngimg.com/d/hookah_PNG10.png', cost: 500, bonus: '+12 дыма за клик' },
  { name: 'Union Hookah', img: 'https://pngimg.com/d/hookah_PNG11.png', cost: 700, bonus: '+18 дыма за клик' },
];
const TOBACCOS = [
  { name: 'Darkside', img: 'https://i.imgur.com/5Qw1QwB.png', baseCost: 30, bonus: '+1 дым за клик за уровень', maxLevel: 5 },
  { name: 'Musthave', img: 'https://i.imgur.com/6Qw1QwB.png', baseCost: 40, bonus: '+1.5 дыма за клик за уровень', maxLevel: 5 },
  { name: 'Tangiers', img: 'https://i.imgur.com/7Qw1QwB.png', baseCost: 60, bonus: '+2 дыма за клик за уровень', maxLevel: 5 },
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

// Новые апгрейды
const UPGRADE_LIST = [
  { name: '🔥 Зеленый уголь', cost: 20, desc: '+2 дыма за клик' },
  { name: '💧 Турбо-колба', cost: 60, desc: '+5 дыма за клик' },
  { name: '🌪️ Двойная тяга', cost: 150, desc: 'x2 дым за клик на 30 сек' },
  { name: '🍃 Премиум табак', cost: 300, desc: '+10 дыма за клик' },
  { name: '🤖 Автообновление кальяна', cost: 500, desc: '+2 дыма в минуту' },
];

// PNG-облака для главного экрана
const CLOUDS = [
  'https://pngimg.com/uploads/smoke/smoke_PNG55217.png',
  'https://pngimg.com/uploads/smoke/smoke_PNG55218.png',
  'https://pngimg.com/uploads/smoke/smoke_PNG55219.png',
  'https://pngimg.com/uploads/smoke/smoke_PNG55220.png',
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
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);
  const [topPlayers, setTopPlayers] = useState<{username:string, smoke:number}[]>([]);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const username = window.Telegram?.WebApp?.initDataUnsafe?.user?.username || '';

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

  // Сохранение прогресса
  useEffect(() => {
    const saved = localStorage.getItem('hookah-progress');
    if (saved) {
      const data = JSON.parse(saved);
      setSmoke(data.smoke || 0);
      setUpgrades(data.upgrades || []);
      setOwnedHookahs(data.ownedHookahs || []);
      setActiveHookah(data.activeHookah || 'Alpha Hookah');
      setTobaccoLevels(data.tobaccoLevels || {});
      setLevel(data.level || 1);
      setExp(data.exp || 0);
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('hookah-progress', JSON.stringify({
      smoke, upgrades, ownedHookahs, activeHookah, tobaccoLevels, level, exp
    }));
  }, [smoke, upgrades, ownedHookahs, activeHookah, tobaccoLevels, level, exp]);

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

  // Получение топа игроков
  useEffect(() => {
    fetch(`${API_URL}/top`).then(r=>r.json()).then(setTopPlayers);
    const interval = setInterval(() => {
      fetch(`${API_URL}/top`).then(r=>r.json()).then(setTopPlayers);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Реалистичный дым при клике + отправка username
  const handleSmoke = async () => {
    const newSmoke = smoke + smokePerClick;
    setSmoke(newSmoke);
    tg.HapticFeedback?.impactOccurred('medium');
    for (let i = 0; i < 3; i++) {
      setSmokeAnims(anims => [...anims, Date.now() + i*100]);
      setTimeout(() => {
        setSmokeAnims(anims => anims.slice(1));
      }, 1400 + i*120);
    }
    await fetch(`${API_URL}/user/smoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: USER_ID, smoke: newSmoke, username })
    });
    // Лвл ап
    const nextExp = exp + smokePerClick;
    if (nextExp >= level*100) {
      setLevel(level+1);
      setExp(nextExp-level*100);
    } else {
      setExp(nextExp);
    }
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

  // Экономика: прогрессия цен апгрейдов и кальянов
  function getUpgradeCost(idx:number) {
    return Math.floor(20 * Math.pow(2, idx));
  }
  function getHookahCost(idx:number) {
    return Math.floor(100 * Math.pow(2, idx));
  }
  function getTobaccoCost(idx:number) {
    return Math.floor(30 * Math.pow(2, idx)); // Assuming base cost for tobacco is 30
  }
  // Unlock chain для апгрейдов
  function canBuyUpgrade(idx:number) {
    if (idx === 0) return !upgrades.includes(UPGRADE_LIST[0].name);
    return upgrades.includes(UPGRADE_LIST[idx-1].name) && !upgrades.includes(UPGRADE_LIST[idx].name);
  }

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
      {/* PNG-облака с анимацией */}
      <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',pointerEvents:'none',zIndex:2}}>
        {CLOUDS.map((src,i)=>(
          <img key={src} src={src} alt="cloud" style={{
            position:'absolute',
            left:`${10+20*i}%`,
            top:`${10+15*i}%`,
            width:'clamp(80px,18vw,180px)',
            opacity:0.18+0.08*i,
            filter:'blur(2px)',
            animation:`cloud-move${i} 32s linear infinite alternate`,
            zIndex:2
          }}/>
        ))}
        <style>{`
          @keyframes cloud-move0 { 0%{transform:translateY(0);} 100%{transform:translateY(-40px);} }
          @keyframes cloud-move1 { 0%{transform:translateY(0);} 100%{transform:translateY(-60px);} }
          @keyframes cloud-move2 { 0%{transform:translateY(0);} 100%{transform:translateY(-30px);} }
          @keyframes cloud-move3 { 0%{transform:translateY(0);} 100%{transform:translateY(-50px);} }
        `}</style>
      </div>
      <header className="header">
        <h1>Тяга</h1>
        <span role="img" aria-label="hookah" style={{fontSize: 'clamp(2rem, 6vw, 3.5rem)'}}>💨</span>
      </header>
      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <>
          <div className="counter-block" style={{position: 'relative', minHeight: 180}}>
            <div style={{marginBottom:'clamp(1.2rem,3vw,2.2rem)', display:'flex', flexDirection:'column', alignItems:'center'}}>
              <img
                src={HOOKAHS.find(h=>h.name===activeHookah)?.img}
                alt={activeHookah}
                style={{width:'clamp(90px,22vw,160px)',height:'clamp(90px,22vw,160px)',objectFit:'contain',borderRadius:'22px',boxShadow:'0 8px 32px #00ff9955',background:'#0f1e13',marginBottom:8,transition:'all 0.4s cubic-bezier(.4,2,.6,1)'}}
              />
              <div style={{color:'#00ff99',fontWeight:700,fontSize:'clamp(1.1rem,2vw,1.3rem)',textShadow:'0 2px 12px #0a0f0c'}}>{activeHookah}</div>
            </div>
            <div className="smoke-count">{smoke} <span role="img" aria-label="smoke">💨</span></div>
            <div className="balance-bar">
              <div className="balance-bar-inner" style={{width: Math.min(100, Math.sqrt(smoke)*10) + '%'}}></div>
            </div>
            <div style={{margin:'8px 0', color:'#00ff99', fontWeight:700, fontSize:'clamp(1rem,2vw,1.2rem)'}}>Уровень: {level} <span style={{color:'#e6ffe6',fontWeight:400}}>({exp}/{level*100})</span></div>
            <div className="balance-bar" style={{height:10,margin:'0 auto 8px auto'}}>
              <div className="balance-bar-inner" style={{width: (exp/level/100*100)+'%', background:'linear-gradient(90deg,#00ff99,#e6ffe6)'}}></div>
            </div>
            <button className="smoke-btn" onClick={handleSmoke}>
              Курить кальян (+{smokePerClick})
            </button>
            <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:'clamp(0.7rem,2vw,1.2rem)'}}>
              <button className="shop-btn" onClick={()=>setShopOpen(true)} style={{minWidth:120}}>🛒 Магазин</button>
              <button className="shop-btn" onClick={()=>setProfileOpen(true)} style={{minWidth:120}}>👤 Профиль</button>
            </div>
            {smokeAnims.map((id, i) => {
              const size = 38 + Math.random()*18;
              const blur = 8 + Math.random()*10;
              const left = `calc(50% + ${Math.sin(id%360)*18 + (Math.random()-0.5)*30}px)`;
              const opacity = 0.5 + Math.random()*0.4;
              return (
                <svg key={id} className="smoke-anim" width={size} height={size} viewBox="0 0 48 48" style={{left, filter:`blur(${blur}px)`, opacity}}>
                  <ellipse cx="24" cy="24" rx="16" ry="10" fill="#e6ffe6" />
                  <ellipse cx="32" cy="18" rx="8" ry="6" fill="#00ff99" opacity="0.5"/>
                  <ellipse cx="16" cy="20" rx="7" ry="5" fill="#00ff99" opacity="0.3"/>
                </svg>
              );
            })}
          </div>
          {shopOpen && (
            <div className="shop-modal" style={{animation:'fadeIn 0.5s'}}>
              <div className="shop-content" style={{animation:'fadeInUp 0.7s', position:'relative'}}>
                <button className="shop-exit-btn" onClick={() => setShopOpen(false)} title="Выйти из магазина">✖️</button>
                <div className="shop-tabs">
                  <button onClick={()=>setShopTab('upgrades')} aria-selected={shopTab==='upgrades'} className={shopTab==='upgrades'?'active':''}>Апгрейды</button>
                  <button onClick={()=>setShopTab('hookahs')} aria-selected={shopTab==='hookahs'} className={shopTab==='hookahs'?'active':''}>Кальяны</button>
                  <button onClick={()=>setShopTab('tobaccos')} aria-selected={shopTab==='tobaccos'} className={shopTab==='tobaccos'?'active':''}>Табаки</button>
                </div>
                {shopTab==='upgrades' && (
                  <div>
                    <h2>Апгрейды</h2>
                    <ul className="upgrades-list">
                      {UPGRADE_LIST.map((item, idx) => (
                        <li key={item.name} style={{marginBottom: 8}}>
                          <b>{item.name}</b> — {getUpgradeCost(idx)}💨<br/>
                          <i>{item.desc}</i><br/>
                          {upgrades.includes(item.name) ? (
                            <span style={{color: '#00ff99'}}>Куплено ✅</span>
                          ) : (
                            <button className="buy-btn" onClick={() => handleBuy(idx)} disabled={smoke < getUpgradeCost(idx) || !canBuyUpgrade(idx)}>
                              Купить
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {shopTab==='hookahs' && (
                  <div>
                    <h2>Кальяны</h2>
                    <ul className="hookahs-list">
                      {HOOKAHS.map((h, idx) => (
                        <li key={h.name} className="hookah-card">
                          <img src={h.img} alt={h.name} className="hookah-img"/>
                          <div className="hookah-info">
                            <div className="hookah-title">{h.name}</div>
                            <div className="hookah-bonus">{h.bonus}</div>
                            <div className="hookah-price">Цена: {getHookahCost(idx)}💨</div>
                            {ownedHookahs.includes(h.name) ? (
                              <span className="hookah-bought">Куплено ✅</span>
                            ) : (
                              <button className="buy-btn" onClick={()=>handleBuyHookah(h.name)} disabled={smoke < getHookahCost(idx)}>
                                Купить
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {shopTab==='tobaccos' && (
                  <div>
                    <h2>Табаки</h2>
                    <ul className="tobaccos-list">
                      {TOBACCOS.map((t, idx) => (
                        <li key={t.name} style={{marginBottom: 8}}>
                          <img src={t.img} alt={t.name} style={{width:40,height:40,objectFit:'contain',borderRadius:8,background:'#0f1e13',marginBottom:4}}/>
                          <div style={{fontWeight:600}}>{t.name}</div>
                          <div style={{fontSize:'0.95em',color:'#00ff99'}}>{t.bonus}</div>
                          <div style={{fontSize:'0.95em'}}>Уровень: {tobaccoLevels[t.name] || 0}/{t.maxLevel}</div>
                          <div style={{fontSize:'0.95em'}}>Цена: {getTobaccoCost(idx)}💨</div>
                          <button className="buy-btn" onClick={()=>handleUpgradeTobacco(t.name)} disabled={smoke < getTobaccoCost(idx) || (tobaccoLevels[t.name]||0) >= t.maxLevel}>
                            {tobaccoLevels[t.name] >= t.maxLevel ? 'Макс' : 'Купить'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          {profileOpen && (
            <div className="shop-modal" style={{animation:'fadeIn 0.5s'}}>
              <div className="shop-content profile-content" style={{animation:'fadeInUp 0.7s', position:'relative'}}>
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
                    {topPlayers.map((p,i)=>(
                      <li key={p.username}><span style={{fontWeight:'bold',color:'#00ff99'}}>{i+1}.</span> @{p.username || 'anon'} <span style={{color:'#888'}}>— {p.smoke}💨</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <audio src="https://cdn.pixabay.com/audio/2023/03/27/audio_12c6b6b1b2.mp3" autoPlay={musicPlaying} loop style={{display:'none'}}/>
      <button onClick={()=>setMusicPlaying(p=>!p)} style={{position:'fixed',bottom:24,right:24,zIndex:1000,background:'#0f1e13cc',color:'#00ff99',border:'none',borderRadius:'50%',width:54,height:54,fontSize:28,boxShadow:'0 2px 8px #00ff9933',cursor:'pointer',transition:'background 0.2s'}} title={musicPlaying?'Остановить музыку':'Включить музыку'}>
        {musicPlaying ? '⏸️' : '🎵'}
      </button>
      <footer className="footer">
        Made by <a href="https://t.me/P04KA" style={{color:'#00ff99',textDecoration:'none',fontWeight:700}} target="_blank" rel="noopener noreferrer">@P04KA</a>
      </footer>
    </div>
  );
}

export default App;
