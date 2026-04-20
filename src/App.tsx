/**
 * @license
 * AnimeSoul - Protected Content
 * Copyright (c) 2026. All rights reserved.
 * This code is protected against unauthorized duplication and modification.
 */

declare global {
    interface Window {
        Telegram: {
            WebApp: {
                ready: () => void;
                expand: () => void;
                close: () => void;
                colorScheme: 'light' | 'dark';
                themeParams: any;
                headerColor: string;
                backgroundColor: string;
                isVersionAtLeast: (version: string) => boolean;
                openTelegramLink: (url: string) => void;
                sendData: (data: string) => void;
                CloudStorage: {
                    setItem: (key: string, value: string, callback?: (err: any, success: any) => void) => void;
                    getItem: (key: string, callback: (err: any, value: any) => void) => void;
                };
                onEvent: (event: string, callback: () => void) => void;
            }
        }
    }
}

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Gem, Sparkles, Users, Sword, Zap, ShoppingBag, Skull, Trophy, ArrowRight, ChevronUp, ChevronDown, Share, Wallet, Star, Settings, Check, X, RotateCcw } from 'lucide-react';
import { useTonConnectUI } from '@tonconnect/ui-react';

import { auth, db, signInAnonymously, onAuthStateChanged, collection, query, orderBy, limit, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, handleFirestoreError, signInWithPopup, googleProvider, isQuotaExceededGlobal } from './firebase';
import { disableNetwork, getDocs } from 'firebase/firestore';

type GameState = {
    gold: number;
    souls: number;
    crystals: number;
    glory: number;
    totalKills: number;
    subStage: number;
    isBoss: boolean;
    bossTime: number;
    player: {
        lvl: number;
        gear: { sword: number; armor: number; wings: number; ring: number };
    };
    mercs: { id: number; name: string; atk: number; cost: number; level: number; ability?: string; maxLevel: number }[];
    mainHero: { id: number; name: string; ability: string };
    unlockedHeroes: number[];
    skills: { id: number; name: string; desc: string; cd: number; last: number }[];
    arts: { id: number; name: string; desc: string; cost: number; owned: boolean; multiplier?: number }[];
    enemy: { hp: number; max: number; name: string };
    buffs: {
        frenzyUntil: number;
        autoClickerUntil: number;
        wrathUntil: number;
    };
    combo: number;
    lastClickTime: number;
    lastSaveTime: number;
};

const INITIAL_STATE: GameState = {
    gold: 100, souls: 0, crystals: 50, glory: 0,
    totalKills: 0, subStage: 1, isBoss: false, bossTime: 30,
    player: { lvl: 1, gear: { sword: 1, armor: 1, wings: 0, ring: 0 } },
    buffs: { frenzyUntil: 0, autoClickerUntil: 0, wrathUntil: 0 },
    combo: 0,
    lastClickTime: 0,
    lastSaveTime: Date.now(),
    mercs: [
        { id:0, name:'Кли', atk:5, cost:20, level:0, maxLevel: 1000 },
        { id:1, name:'Цици', atk:22, cost:150, level:0, maxLevel: 1000 },
        { id:2, name:'Диона', atk:95, cost:800, level:0, maxLevel: 1000 },
        { id:3, name:'Саю', atk:450, cost:4500, level:0, maxLevel: 1000 },
        { id:4, name:'Нахида', atk:1800, cost:22000, level:0, maxLevel: 1000 },
        { id:5, name:'Дори', atk:8500, cost:150000, level:0, maxLevel: 1000 },
        { id:6, name:'Яояо', atk:42000, cost:900000, level:0, maxLevel: 1000 },
        { id:7, name:'Сиджвин', atk:250000, cost:5000000, level:0, maxLevel: 1000 },
        { id:8, name:'Качина', atk:1200000, cost:25000000, level:0, ability:'+10% к золоту', maxLevel: 1000 },
        { id:9, name:'Паймон', atk:5000000, cost:100000000, level:0, ability:'+20% шанс x2 Душ', maxLevel: 1000 },
        { id:10, name:'Фурина', atk:20000000, cost:500000000, level:0, ability:'+5% к урону', maxLevel: 1000 },
        { id:11, name:'Ху Тао', atk:80000000, cost:2500000000, level:0, ability:'+5% к урону', maxLevel: 1000 },
        { id:12, name:'Нилу', atk:350000000, cost:12000000000, level:0, ability:'+5% к урону', maxLevel: 1000 },
        { id:13, name:'Гань Юй', atk:1500000000, cost:60000000000, level:0, ability:'+5% к урону', maxLevel: 1000 },
        { id:14, name:'Аяка', atk:7000000000, cost:300000000000, level:0, ability:'+5% к урону', maxLevel: 1000 },
        { id:15, name:'Люмин', atk:30000000000, cost:1500000000000, level:0, ability:'+5% к урону', maxLevel: 1000 },
        { id:16, name:'Яэ Мико', atk:150000000000, cost:7500000000000, level:0, ability:'+5% к урону', maxLevel: 1000 },
        { id:17, name:'Райдэн', atk:800000000000, cost:40000000000000, level:0, ability:'+5% к урону', maxLevel: 1000 }
    ],
    mainHero: { id: 0, name: 'Люмин', ability: 'Путешественница' },
    unlockedHeroes: [0],
    skills: [
        { id:0, name:'Удар Звезды', desc:'Урон x50 мгновенно', cd:20, last:0 },
        { id:1, name:'Безумие', desc:'Авто-клик 10/сек на 5с', cd:60, last:0 },
        { id:2, name:'Остановка Времени', desc:'+10с к таймеру босса', cd:120, last:0 },
        { id:3, name:'Золотой Дождь', desc:'Золото х10 от награды', cd:90, last:0 },
        { id:4, name:'Гнев', desc:'Весь урон х10 на 10с', cd:180, last:0 }
    ],
    arts: [
        { id:0, name:'Золотой Амулет', desc:'x2 Золота', cost:100, owned:false },
        { id:1, name:'Кристалл Маны', desc:'x2 Урона клика', cost:250, owned:false },
        { id:2, name:'Кольцо Времени', desc:'+5с к боссам', cost:500, owned:false },
        { id:3, name:'Крылья Ангела', desc:'x2 Пассивный DPS', cost:1000, owned:false },
        { id:4, name:'Песочные Часы', desc:'-20% КД Навыков', cost:2000, owned:false },
        { id:5, name:'Печать Жатвы', desc:'+25% Душ с боссов', cost:5000, owned:false },
        { id:6, name:'Кубок Изобилия', desc:'+50% Золота отовсюду', cost:15000, owned:false },
        { id:7, name:'Зеркало Иллюзий', desc:'Шанс крита +10%', cost:30000, owned:false },
        { id:8, name:'Сердце Титана', desc:'Урон x3 (общий)', cost:75000, owned:false },
        { id:9, name:'Глаз Пустоты', desc:'КД Навыков -15%', cost:150000, owned:false },
        { id:10, name:'Корона Грёз', desc:'Награды Гачи x2', cost:300000, owned:false },
        { id:11, name:'Эссенция Бессмертия', desc:'Таймер боссов +10с', cost:750000, owned:false },
        { id:12, name:'Меч Истины', desc:'Урон x10 (общий)', cost:2000000, owned:false }
    ],
    enemy: { hp: 100, max: 100, name: 'Слайм' }
};

const HEROES_DATA = [
    { id: 0, name: 'Воин', ability: 'Никаких бонусов', gloryReq: 0, cost: 0, color: 'text-zinc-400' },
    { id: 1, name: 'Ассасин', ability: '+20% Критический урон', gloryReq: 5, cost: 50000, color: 'text-green-500' },
    { id: 2, name: 'Странник', ability: '+50% Базовый урон', gloryReq: 20, cost: 1000000, color: 'text-purple-500' },
    { id: 3, name: 'Владыка', ability: 'x2 Общий урон', gloryReq: 100, cost: 500000000, color: 'text-red-500' },
];

function getClickDmg(state: GameState, comboMult: number = 1): { dmg: number, isCrit: boolean } {
    let dmg = (15 + Number(state.player.gear.sword) * 30) * (1 + Number(state.player.lvl) * 0.25);
    dmg *= (1 + Number(state.glory) * 0.25);
    
    if (state.mainHero.id === 2) dmg *= 1.5;
    
    // Merc ability dmg boost (Furina, Hu Tao, etc.)
    let mercDmgMult = 1;
    state.mercs.forEach(m => {
        if (m.level > 0 && m.id >= 10) mercDmgMult += 0.05;
    });
    dmg *= mercDmgMult;
    
    // Apply Combo Multiplier
    dmg *= comboMult;
    
    // Calculate critical hit
    let critChance = 0.08 + Number(state.player.gear.armor) * 0.02; // Base 8% + 2% per armor level
    if (state.arts[7]?.owned) critChance += 0.10; 

    let critMultiplier = 2 + Number(state.player.gear.armor) * 0.15; // Base 200% + 15% per armor level
    if (state.mainHero.id === 1) critMultiplier += 0.5;
    
    let isCrit = false;
    if (Math.random() < critChance) {
        dmg *= critMultiplier;
        isCrit = true;
    }

    if (state.mainHero.id === 3) dmg *= 2;
    if(state.arts[1].owned) dmg *= 2;
    if(state.arts[8]?.owned) dmg *= 3; 
    if(state.arts[12]?.owned) dmg *= 10; 
    
    if (state.buffs.wrathUntil > Date.now()) {
        dmg *= 10;
        isCrit = true; 
    }
    return { dmg: Math.floor(dmg), isCrit };
}

function getStaticDps(state: GameState) {
    let dps = 0;
    state.mercs.forEach(m => dps += Number(m.atk) * Number(m.level));
    dps *= (1 + Number(state.player.gear.ring) * 0.25); // Ring boosts DPS 25%
    dps *= (1 + Number(state.glory) * 0.25);
    
    // Merc ability dmg boost
    let mercDmgMult = 1;
    state.mercs.forEach(m => {
        if (m.level > 0 && m.id >= 10) mercDmgMult += 0.05;
    });
    dps *= mercDmgMult;
    
    if(state.arts[3].owned) dps *= 2;
    if (state.mainHero.id === 3) dps *= 2;
    if(state.arts[8]?.owned) dps *= 3; 
    if(state.arts[12]?.owned) dps *= 10; 
    
    if (state.buffs.wrathUntil > Date.now()) dps *= 10;
    return Math.floor(dps);
}

function spawnMonster(state: GameState): GameState {
    const stage = Math.floor(state.totalKills / 5) + 1;
    const isBoss = (state.subStage === 5);
    // Adjusted scaling to 1.55 for better late game balance
    let maxHp = Math.floor((isBoss ? 450 : 90) * Math.pow(1.55, stage));
    let bTime = 30;
    if (state.arts[2].owned) bTime += 5;
    if (state.arts[11]?.owned) bTime += 10; 
    
    const stageForIcon = Math.floor(state.totalKills / 5);
    const exactName = isBoss 
        ? BOSS_NAMES[stageForIcon % BOSS_NAMES.length]
        : NORMAL_MONSTER_NAMES[state.totalKills % NORMAL_MONSTER_NAMES.length];

    const displayName = (!isBoss && stageForIcon > 0) ? `Элитный ${exactName}` : exactName;

    return {
        ...state,
        isBoss,
        bossTime: bTime,
        enemy: {
            hp: maxHp,
            max: maxHp,
            name: `${displayName} (Lv.${stage * (isBoss ? 10 : 1)})`
        }
    };
}

function applyDamage(state: GameState, amt: number, isClick: boolean): GameState {
    let newState = { ...state, enemy: { ...state.enemy, hp: state.enemy.hp - amt } };
    
    if (newState.enemy.hp <= 0) {
        const stage = Math.floor(newState.totalKills / 5) + 1;
        // HP/10 Gold Scaling
        let rew = Math.floor(newState.enemy.max / 10);
        
        // Merc ability (Kachina +10%)
        if (newState.mercs[8].level > 0) rew *= 1.1;
        
        if(newState.arts[0].owned) rew *= 2;
        if(newState.arts[6]?.owned) rew *= 1.5; 
        newState.gold += rew;
        
        newState.totalKills++;
        if(newState.isBoss) {
            newState.subStage = 1;
            newState.crystals += 3;
            let soulGain = Math.floor(stage * 1.5);
            
            // Paimon ability (20% chance x2 Souls)
            if (newState.mercs[9].level > 0 && Math.random() < 0.2) {
                soulGain *= 2;
            }
            
            if (newState.arts[5]?.owned) soulGain = Math.floor(soulGain * 1.25); 
            newState.souls += soulGain;
        } else {
            newState.subStage++;
        }
        newState = spawnMonster(newState);
    }
    return newState;
}

function format(n: number) {
    if (!n || isNaN(n)) return '0';
    if (n >= 1e21) return (n/1e21).toFixed(2) + 'Sx';
    if (n >= 1e18) return (n/1e18).toFixed(2) + 'Qi';
    if (n >= 1e15) return (n/1e15).toFixed(2) + 'Q';
    if (n >= 1e12) return (n/1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
    return Math.floor(n).toString();
}

/**
 * Generates a stable guest name based on a string (like a UID)
 */
function generateGuestName(uid: string) {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
        hash = ((hash << 5) - hash) + uid.charCodeAt(i);
        hash |= 0; 
    }
    const num = Math.abs(hash % 10000).toString().padStart(4, '0');
    return `Guest #${num}`;
}

const TABS = [
    { id: 'team', label: 'Команда', icon: Users },
    { id: 'hero', label: 'Протагонист', icon: Sword },
    { id: 'skills', label: 'Навыки', icon: Zap },
    { id: 'shop', label: 'Магазин', icon: ShoppingBag },
    { id: 'arts', label: 'Реликвии', icon: Skull },
    { id: 'donate', label: 'Буст', icon: Star },
    { id: 'leaderboard', label: 'Рейтинг', icon: Trophy },
    { id: 'prestige', label: 'Исекай', icon: Sparkles },
];

const DONATE_ITEMS = [
    { 
        id: 'crystals_small', 
        name: 'Горсть Звезд', 
        desc: '1,000 Кристаллов для Гачи', 
        ton: 0.1, 
        icon: '💎',
        action: (set: any) => set((prev: any) => ({ ...prev, crystals: prev.crystals + 1000 }))
    },
    { 
        id: 'gold_boost', 
        name: 'Золотая Лихорадка', 
        desc: 'Мгновенно: x1000 золота от текущего этапа', 
        ton: 0.25, 
        icon: '💰',
        action: (set: any) => set((prev: any) => {
            const stage = Math.floor(prev.totalKills / 5) + 1;
            const stageGold = Math.floor(80 * Math.pow(1.45, stage)) / 12;
            return { ...prev, gold: prev.gold + (stageGold * 1000) };
        })
    },
    { 
        id: 'infinite_spirits', 
        name: 'Дар Богов', 
        desc: '50,000 Душ для покупки Реликвий', 
        ton: 0.5, 
        icon: '🔥',
        action: (set: any) => set((prev: any) => ({ ...prev, souls: prev.souls + 50000 }))
    },
    { 
        id: 'super_pack', 
        name: 'Набор Героя', 
        desc: '5k Кристаллов + 100k Душ + x5000 золота', 
        ton: 1.0, 
        icon: '🎁',
        action: (set: any) => set((prev: any) => {
            const stage = Math.floor(prev.totalKills / 5) + 1;
            const stageGold = Math.floor(80 * Math.pow(1.45, stage)) / 12;
            return { 
                ...prev, 
                crystals: prev.crystals + 5000,
                souls: prev.souls + 100000,
                gold: prev.gold + (stageGold * 5000)
            };
        })
    },
];

const GENSHIN_LOLIS = [
    'UI_AvatarIcon_Klee',
    'UI_AvatarIcon_Qiqi',
    'UI_AvatarIcon_Diona',
    'UI_AvatarIcon_Sayu',
    'UI_AvatarIcon_Nahida',
    'UI_AvatarIcon_Dori',
    'UI_AvatarIcon_Yaoyao',
    'UI_AvatarIcon_Sigewinne',
    'UI_AvatarIcon_Kachina',
    'UI_AvatarIcon_Paimon',
    'UI_AvatarIcon_Furina',
    'UI_AvatarIcon_Hutao',
    'UI_AvatarIcon_Nilou',
    'UI_AvatarIcon_Ganyu',
    'UI_AvatarIcon_Ayaka',
    'UI_AvatarIcon_Lumine',
    'UI_AvatarIcon_Yae',
    'UI_AvatarIcon_Raiden'
];

const BOSS_ICONS = [
    'Enemy_Dvalin_Icon.png',
    'Enemy_Andrius_Icon.png',
    'Enemy_Childe_Icon.png',
    'Enemy_La_Signora_Icon.png',
    'Enemy_Magatsu_Mitake_Narukami_no_Mikoto_Icon.png'
];

const NORMAL_MONSTERS = [
    'Enemy_Pyro_Slime_Icon.png',
    'Enemy_Hydro_Slime_Icon.png',
    'Enemy_Anemo_Slime_Icon.png',
    'Enemy_Electro_Slime_Icon.png',
    'Enemy_Hilichurl_Icon.png',
    'Enemy_Wooden_Shield_Hilichurl_Guard_Icon.png',
    'Enemy_Hydro_Samachurl_Icon.png',
    'Enemy_Pyro_Abyss_Mage_Icon.png',
    'Enemy_Ruin_Guard_Icon.png',
    'Enemy_Ruin_Hunter_Icon.png'
];

const BOSS_NAMES = [
    'Двалин (Ужас Бури)',
    'Волчий Лорд (Андриус)',
    'Тарталья (Чайльд)',
    'Синьора',
    'Сёгун Райдэн'
];

const NORMAL_MONSTER_NAMES = [
    'Пиро Слайм',
    'Гидро Слайм',
    'Анемо Слайм',
    'Электро Слайм',
    'Хиличурл',
    'Хиличурл со щитом',
    'Гидро Шамачурл',
    'Пиро Маг Бездны',
    'Страж Руин',
    'Руинный Охотник'
];

const HERO_ICONS = [
    'UI_AvatarIcon_Lumine', // Warrior
    'UI_AvatarIcon_Hutao',  // Assassin
    'UI_AvatarIcon_Ganyu',  // Wanderer
    'UI_AvatarIcon_Furina'  // Lord
];

const handleImageError = (fallbackData: string) => (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (e.currentTarget.src !== fallbackData) {
        e.currentTarget.src = fallbackData;
    }
};

function Particles({ color }: { color: string }) {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
            {[...Array(15)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color, left: `${Math.random() * 100}%`, top: `${70 + Math.random() * 30}%`, filter: `drop-shadow(0 0 4px ${color})` }}
                    animate={{
                        y: [0, -150 - Math.random() * 100],
                        x: [(Math.random() - 0.5) * 50, (Math.random() - 0.5) * 100],
                        opacity: [0, 0.8, 0],
                        scale: [0, 1.5, 0],
                    }}
                    transition={{
                        duration: 2 + Math.random() * 3,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                        ease: "easeOut"
                    }}
                />
            ))}
        </div>
    );
}

function TeamAvatar({ index, level, name, ...props }: { index: number, level: number, name: string, [key: string]: any }) {
    if (level === 0) return null;
    const isEpic = index > 5;
    
    const iconName = GENSHIN_LOLIS[index % GENSHIN_LOLIS.length];

    return (
        <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: [0, -3, 0], opacity: 1 }}
            transition={{ y: { duration: 2 + index * 0.2, repeat: Infinity, ease: "easeInOut" } }}
            className="relative flex flex-col items-center group"
        >
            <div className="w-16 h-16 relative overflow-visible transition-transform group-hover:scale-110">
                <div className={`absolute inset-0 rounded-full border-2 overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] ${isEpic ? 'bg-purple-900 border-yellow-500' : 'bg-[#e9e5dc] border-zinc-500'}`}>
                    <img 
                        src={`https://enka.network/ui/${iconName}.png`} 
                        alt={name} 
                        onError={handleImageError('https://enka.network/ui/UI_AvatarIcon_Paimon.png')}
                        className="w-full h-full object-cover filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                        referrerPolicy="no-referrer"
                    />
                </div>
                {isEpic && <div className="absolute -inset-1 rounded-full border border-yellow-500/50 animate-spin" style={{ animationDuration: '3s' }} />}
                <div className="absolute -bottom-2 left-0 w-full text-center text-[10px] font-black text-white bg-black/80 rounded-full px-1 shadow-md border border-zinc-700">LV.{level}</div>
            </div>
            <div className={`mt-3 text-[10px] font-extrabold uppercase tracking-wider drop-shadow-md whitespace-nowrap ${isEpic ? 'text-yellow-400' : 'text-zinc-300'}`}>{name}</div>
        </motion.div>
    );
}

function HeroPortrait({ level, heroId }: { level: number; heroId: number }) {
    const iconName = HERO_ICONS[heroId % HERO_ICONS.length] || 'UI_AvatarIcon_Lumine';
    
    return (
        <div className="relative w-full max-w-[130px] lg:max-w-none lg:w-52 h-[180px] lg:h-[340px] group origin-bottom mx-auto flex items-end justify-center pb-8">
            <div className="absolute inset-0 bg-gradient-to-t from-red-900/30 to-transparent rounded-t-full -z-10 pointer-events-none"></div>
            
            <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-32 h-40 lg:w-48 lg:h-64"
            >
                <img 
                    src={`https://enka.network/ui/${iconName}.png`}
                    alt="Hero"
                    onError={handleImageError('https://enka.network/ui/UI_AvatarIcon_Paimon.png')}
                    className="w-full h-full object-contain filter drop-shadow-[0_10px_15px_rgba(239,68,68,0.4)]"
                    referrerPolicy="no-referrer"
                />
            </motion.div>
            
            <div className="absolute bottom-2 left-0 w-full flex flex-col items-center z-30 pointer-events-none">
                <div className="text-red-500 font-black text-[10px] tracking-[0.4em] uppercase mb-0 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">Awakened</div>
                <div className="text-3xl font-black text-white drop-shadow-lg">LV. {level}</div>
            </div>
        </div>
    );
}

function MonsterPortrait({ isBoss, kills, name }: { isBoss: boolean, kills: number, name: string }) {
    const stage = Math.floor(kills / 5);
    const iconName = isBoss 
        ? BOSS_ICONS[stage % BOSS_ICONS.length] 
        : NORMAL_MONSTERS[kills % NORMAL_MONSTERS.length];

    return (
        <div className={`relative w-full max-w-[150px] lg:max-w-none lg:w-64 h-[180px] lg:h-[340px] origin-bottom mx-auto flex items-center justify-center overflow-visible`}>
            {isBoss && (
                <div className="absolute inset-0 bg-red-500/20 blur-[50px] rounded-full pointer-events-none animate-pulse"></div>
            )}
            
            {/* Ground shadow to prevent floating appearance */}
            <div className="absolute bottom-[5%] lg:bottom-[10%] w-[60%] lg:w-[80%] h-[15%] bg-black/60 rounded-[100%] blur-md z-0 transition-all"></div>
            {isBoss && <div className="absolute bottom-[2%] lg:bottom-[5%] w-[80%] lg:w-[120%] h-[30%] bg-red-900/40 rounded-[100%] blur-xl z-0 transition-all animate-pulse"></div>}
            
            <AnimatePresence mode="popLayout">
                <motion.div
                    key={iconName + kills}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.2, filter: "blur(5px)" }}
                    transition={{ duration: 0.15 }}
                    className={`absolute flex items-center justify-center z-10 w-full h-full`}
                >
                    <motion.div
                        animate={{ y: [0, isBoss ? -15 : -8, 0], scale: isBoss ? [1, 1.05, 1] : 1 }}
                        transition={{ duration: isBoss ? 2 : 3, repeat: Infinity, ease: "easeInOut" }}
                        className={`relative z-10 flex items-center justify-center ${isBoss ? 'w-[120%] h-[120%] lg:w-[150%] lg:h-[150%]' : 'w-[80%] h-[80%] lg:w-[100%] lg:h-[100%]'}`}
                    >
                        <img 
                            src={`https://genshin-impact.fandom.com/wiki/Special:FilePath/${iconName}`}
                            alt={name}
                            onError={handleImageError('https://genshin-impact.fandom.com/wiki/Special:FilePath/Enemy_Pyro_Slime_Icon.png')}
                            className={`w-full h-full object-contain filter drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] ${isBoss ? 'brightness-110 drop-shadow-[0_0_40px_rgba(239,68,68,0.8)]' : ''}`}
                            referrerPolicy="no-referrer"
                        />
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

const GACHA_PRIZES = [
    { type: 'gold_relative', multiplier: 25, text: "Мешок Золота", desc: "x25 золота от этапа", color: "#3b82f6", weight: 40 },
    { type: 'souls_relative', multiplier: 5, text: "Сгусток Душ", desc: "x5 душ за этап", color: "#f59e0b", weight: 30 },
    { type: 'crystals', amount: 300, text: "300 Кристаллов", desc: "+300 кристаллов", color: "#a855f7", weight: 15 },
    { type: 'gold_relative', multiplier: 500, text: "Гора Золота", desc: "x500 золота от этапа", color: "#1e40af", weight: 10 },
    { type: 'souls_relative', multiplier: 50, text: "Дар Предков", desc: "x50 душ за этап", color: "#7c2d12", weight: 4 },
    { type: 'crystals', amount: 5000, text: "Джекпот Книжника", desc: "+5000 кристаллов", color: "#db2777", weight: 1 },
];

export default function App() {
    const [gameState, setGameState] = useState<GameState>(() => {
        try {
            const saved = localStorage.getItem('animeSoul_save');
            if (saved) {
                let rawData = saved;
                if (!saved.startsWith('{')) {
                    try {
                        rawData = decodeURIComponent(atob(saved));
                    } catch(e) { rawData = saved; }
                }
                const parsed = JSON.parse(rawData); 
                if (parsed.gold < 0 || isNaN(parsed.gold)) parsed.gold = 0;
                if (parsed.souls < 0 || isNaN(parsed.souls)) parsed.souls = 0;
                
                return {
                    ...INITIAL_STATE,
                    ...parsed,
                    player: {
                        ...INITIAL_STATE.player,
                        ...(parsed.player || {}),
                        gear: {
                            ...INITIAL_STATE.player.gear,
                            ...(parsed.player?.gear || {})
                        }
                    },
                    buffs: {
                        ...INITIAL_STATE.buffs,
                        ...(parsed.buffs || {})
                    },
                    mercs: INITIAL_STATE.mercs.map(m => {
                        const savedMerc = parsed.mercs?.find((sm: any) => sm.id === m.id);
                        return savedMerc ? { ...m, level: savedMerc.level } : m;
                    }),
                    skills: INITIAL_STATE.skills.map(s => {
                        const savedSkill = parsed.skills?.find((ss: any) => ss.id === s.id);
                        return savedSkill ? { ...s, last: savedSkill.last } : s;
                    }),
                    arts: INITIAL_STATE.arts.map(a => {
                        const savedArt = parsed.arts?.find((sa: any) => sa.id === a.id);
                        return savedArt ? { ...a, owned: savedArt.owned } : a;
                    })
                };
            }
        } catch (e) { console.error("Load error", e); }
        return spawnMonster(INITIAL_STATE);
    });

    const [activeTab, setActiveTab] = useState('team');
    const [tonConnectUI] = useTonConnectUI();
    const [damagePopups, setDamagePopups] = useState<{id: number, val: number, x: number, y: number, isCrit: boolean}[]>([]);
    const [lastActiveDps, setLastActiveDps] = useState(0);
    const [gachaModal, setGachaModal] = useState<{show: boolean, spinning: boolean, prize: any, rotation: number, error?: string | null}>({show: false, spinning: false, prize: null, rotation: 0});
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [playerName, setPlayerName] = useState('Аноним');
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const isAdmin = auth.currentUser?.email === 'nevmovenko2004@gmail.com';

    const adminCommands = {
        addGold: (amount: number = 1e12) => {
            setGameState(prev => ({ ...prev, gold: prev.gold + amount }));
            (window as any).Telegram?.WebApp?.showAlert?.(`Добавлено ${format(amount)} золота!`);
        },
        addSouls: (amount: number = 10000) => {
            setGameState(prev => ({ ...prev, souls: prev.souls + amount }));
            (window as any).Telegram?.WebApp?.showAlert?.(`Добавлено ${format(amount)} душ!`);
        },
        addCrystals: (amount: number = 5000) => {
            setGameState(prev => ({ ...prev, crystals: prev.crystals + amount }));
            (window as any).Telegram?.WebApp?.showAlert?.(`Добавлено ${format(amount)} кристаллов!`);
        },
        addGlory: (amount: number = 100) => {
            setGameState(prev => ({ ...prev, glory: prev.glory + amount }));
            (window as any).Telegram?.WebApp?.showAlert?.(`Добавлено ${format(amount)} славы!`);
        },
        skipStages: (count: number = 10) => {
            setGameState(prev => {
                let next = { ...prev, totalKills: prev.totalKills + (count * 5) };
                return spawnMonster(next);
            });
            (window as any).Telegram?.WebApp?.showAlert?.(`Пропущено ${count} уровней!`);
        },
        resetCooldowns: () => {
            setGameState(prev => ({
                ...prev,
                skills: prev.skills.map(s => ({ ...s, last: 0 }))
            }));
            (window as any).Telegram?.WebApp?.showAlert?.("Все способности перезаряжены!");
        },
        maxEverything: () => {
            setGameState(prev => ({
                ...prev,
                gold: 1e30,
                souls: 1e15,
                crystals: 1e9,
                player: {
                    lvl: 100,
                    gear: { sword: 100, armor: 100, wings: 100, ring: 100 }
                },
                mercs: prev.mercs.map(m => ({ ...m, level: m.maxLevel })),
                unlockedHeroes: HEROES_DATA.map(h => h.id)
            }));
            (window as any).Telegram?.WebApp?.showAlert?.("РЕЖИМ БОГА АКТИВИРОВАН!");
        }
    };

    const globalLeaderboardCleanup = async () => {
        if (!isAdmin || isCleaning || isQuotaExceededGlobal) return;
        
        setIsCleaning(true);
        const tg = (window as any).Telegram?.WebApp;
        
        try {
            console.log("Admin Global Cleanup starting...");
            const snapshot = await getDocs(collection(db, 'leaderboard'));
            const uniqueUsers = new Map();
            const toDelete: string[] = [];

            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;
                
                // Identify the human behind the entry
                const key = data.tgId ? `tg_${data.tgId}` : (data.googleUid || data.uid || (data.username || '').toLowerCase().trim());
                
                // Logic check: "Impossible" or "Broken" values
                // Current max stage is likely way below 1000 for honest players
                const isImpossible = data.stage > 1200 || data.powerScore > 1e18; 
                const name = (data.username || '').toLowerCase();
                const isTest = name.includes('test') || name.includes('gemini') || name.includes('ais agent') || name.includes('ais_agent');

                if (isImpossible || isTest || !key) {
                    toDelete.push(id);
                    return;
                }

                if (!uniqueUsers.has(key)) {
                    uniqueUsers.set(key, { id, powerScore: data.powerScore || 0 });
                } else {
                    const existing = uniqueUsers.get(key);
                    if ((data.powerScore || 0) > existing.powerScore) {
                        toDelete.push(existing.id);
                        uniqueUsers.set(key, { id, powerScore: data.powerScore || 0 });
                    } else {
                        toDelete.push(id);
                    }
                }
            });

            console.log(`Global Cleanup: Identified ${toDelete.length} entries for removal.`);
            
            for (let i = 0; i < toDelete.length; i++) {
                // Delete in small batches if needed, but here we just go through them
                await deleteDoc(doc(db, 'leaderboard', toDelete[i])).catch(err => {
                    console.error(`Failed to delete ${toDelete[i]}`, err);
                });
            }
            
            tg?.showAlert?.(`Глобальная очистка завершена! Удалено ${toDelete.length} дубликатов/мусора.`);
        } catch (err) {
            console.error("Global cleanup failed", err);
            tg?.showAlert?.("Ошибка при глобальной очистке.");
        } finally {
            setIsCleaning(false);
        }
    };
    const [newName, setNewName] = useState('');
    const [flyingChest, setFlyingChest] = useState<{x: number, y: number, show: boolean, type: 'gold' | 'gems' | 'souls'}>({x: 0, y: 0, show: false, type: 'gold'});
    
    const playerNameRef = useRef(playerName);
    const isQuotaExceededRef = useRef(false);
    const comboRef = useRef(0);
    const lastClickRef = useRef(Date.now());
    const popupIdRef = useRef(0);
    const activeDpsBufRef = useRef(0);
    const gameStateRef = useRef(gameState);
    const lastSyncTimeRef = useRef(0);
    const lastSyncedStageRef = useRef(0);
    const cloudSyncCooldownRef = useRef(0);

    const handleGoogleSignIn = async () => {
        try {
            console.log("Starting Google Sign-In...");
            await signInWithPopup(auth, googleProvider);
            console.log("Google Sign-In successful");
        } catch (error: any) {
            console.error("Google auth fail:", error.code, error.message);
            setAuthError(`Ошибка входа: ${error.message}`);
        }
    };

    // --- Effects ---
    useEffect(() => { 
        playerNameRef.current = playerName; 
    }, [playerName]);

    useEffect(() => { 
        gameStateRef.current = gameState; 
        
        // Optimized Local Save: Throttled to prevent disk thrashing
        // We only save locally immediately if it's a significant change (stage/substage)
        // Otherwise, the periodic save takes care of it.
        const stageKey = `${gameState.totalKills}_${gameState.subStage}`;
        const lastStageKey = useRefStageKey.current;
        if (stageKey !== lastStageKey) {
            localStorage.setItem('animeSoul_save', JSON.stringify({ ...gameState, lastSaveTime: Date.now() }));
            useRefStageKey.current = stageKey;
        }
    }, [gameState]);

    // Track stage key for optimized saving
    const useRefStageKey = useRef('');

    // --- Identity Helper ---
    const getIdentityId = () => {
        if (!auth.currentUser) return null;
        // The Identity ID is the primary key for the cloud save document.
        // We prioritize Google UID if they are logged in.
        if (!auth.currentUser.isAnonymous) return auth.currentUser.uid;
        
        // Inside Telegram, the User ID is a perfect stable anchor.
        const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser && tgUser.id) return `tg_${tgUser.id}`;
        
        // If all else fails, use the Firebase device-bound UID.
        return auth.currentUser.uid;
    };

    // Consolidated Cloud Sync (Throttled & Debounced)
    useEffect(() => {
        // Skip if not logged in or quota is out
        const identityId = getIdentityId();
        if (!isAuthReady || !auth.currentUser || !identityId || isQuotaExceededRef.current || isQuotaExceededGlobal) return;

        const performCloudSync = async () => {
            const now = Date.now();
            const stage = Math.floor(gameStateRef.current.totalKills / 5) + 1;
            
            // Strictly enforce cooldowns
            const stageChanged = stage >= lastSyncedStageRef.current + 1;
            const cooldown = stageChanged ? 60000 : 180000;

            if (now - cloudSyncCooldownRef.current < cooldown) return;

            try {
                if (isQuotaExceededRef.current || isQuotaExceededGlobal) return;

                console.log(`Cloud Sync: Saving to identity [${identityId}]...`);
                
                const userRef = doc(db, 'users', identityId);
                const leaderboardRef = doc(db, 'leaderboard', identityId);

                const powerScore = (gameStateRef.current.glory * 1000000) + gameStateRef.current.totalKills;

                const leaderboardEntry = {
                    uid: identityId,
                    tgId: (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || null,
                    googleUid: auth.currentUser!.isAnonymous ? null : auth.currentUser!.uid,
                    username: playerNameRef.current,
                    stage,
                    subStage: gameStateRef.current.subStage,
                    dps: getStaticDps(gameStateRef.current),
                    glory: gameStateRef.current.glory,
                    powerScore,
                    lastUpdated: serverTimestamp()
                };

                await Promise.all([
                    setDoc(userRef, { ...gameStateRef.current, updatedAt: serverTimestamp() }, { merge: true }),
                    setDoc(leaderboardRef, leaderboardEntry, { merge: true })
                ]);

                cloudSyncCooldownRef.current = now;
                lastSyncedStageRef.current = stage;
                lastSyncTimeRef.current = now;

                // Cleanup: If this is a Google account, we might have an old Telegram-only leaderboard entry
                const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
                if (!auth.currentUser!.isAnonymous && tgUser && tgUser.id) {
                    const oldTgId = `tg_${tgUser.id}`;
                    if (oldTgId !== identityId) {
                        deleteDoc(doc(db, 'leaderboard', oldTgId)).catch(() => {});
                    }
                }
            } catch (err) {
                handleFirestoreError(err, 'WRITE', 'cloud-sync');
            }
        };

        const timer = setTimeout(performCloudSync, 15000); 
        return () => clearTimeout(timer);
    }, [gameState.totalKills, gameState.subStage, gameState.glory, isAuthReady, auth.currentUser]);

    // Error handling effect
    useEffect(() => {
        const handleCustomError = (e: any) => {
            setAuthError(e.detail);
            if (e.detail?.includes('лимит') || e.detail?.includes('Quota') || isQuotaExceededGlobal) {
                isQuotaExceededRef.current = true;
                disableNetwork(db).catch(() => {});
            }
        };
        window.addEventListener('auth-error-trigger', handleCustomError);
        return () => window.removeEventListener('auth-error-trigger', handleCustomError);
    }, []);

    useEffect(() => {
        if (authError) {
            const timer = setTimeout(() => setAuthError(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [authError]);


    useEffect(() => {
        // --- Telegram Mini App Initialization ---
        try {
            const tg = (window as any).Telegram?.WebApp;
            if (tg) {
                try { tg.ready(); } catch(e) {}
                try { tg.expand(); } catch(e) {}
                
                // Get player name from Telegram
                const tgUser = tg.initDataUnsafe?.user;
                if (tgUser) {
                    const name = tgUser.username || `${tgUser.first_name} ${tgUser.last_name}`.trim();
                    if (name) setPlayerName(name);
                }

                // Sync with Telegram Theme
                const updateTheme = () => {
                    try {
                        if (tg.backgroundColor) document.body.style.backgroundColor = tg.backgroundColor;
                        if (tg.colorScheme === 'dark') {
                            document.documentElement.classList.add('dark');
                        } else {
                            document.documentElement.classList.remove('dark');
                        }
                    } catch(e) {}
                };
                try {
                    tg.onEvent('themeChanged', updateTheme);
                    updateTheme();
                } catch(e) {}

                // Load from CloudStorage if supported (v6.9+) - Disabled due to DATA_TOO_LONG errors
                
                // --- NEW SYNC LOGIC: Migrate localStorage to Firebase ---
                const migrateSave = async () => {
                    if (isQuotaExceededRef.current || isQuotaExceededGlobal) return;
                    const saved = localStorage.getItem('animeSoul_save');
                    if (saved) {
                        try {
                            const tgUser = tg.initDataUnsafe?.user;
                            if (tgUser && tgUser.id) {
                                const saveDocRef = doc(db, 'saves', tgUser.id.toString());
                                const rawData = saved.startsWith('{') ? saved : decodeURIComponent(atob(saved));
                                await setDoc(saveDocRef, JSON.parse(rawData));
                                localStorage.removeItem('animeSoul_save'); // Clear after migration
                                console.log("Save migrated to Firebase");
                            }
                        } catch (e) {
                            handleFirestoreError(e, 'WRITE', 'migration');
                        }
                    }
                };
                migrateSave();
            }
        } catch (e) {
            console.error("TG Init suppressed error", e);
        }

        console.clear();
        console.log("%cANIMESOUL %cSECURITY %cACTIVE", 
            "color: red; font-size: 24px; font-weight: bold;", 
            "color: white; font-size: 24px; font-weight: bold; background: red; padding: 0 4px;",
            "color: green; font-size: 24px; font-weight: bold;");
        console.log("Protection layers loaded. Unauthorized access is prohibited.");
        
        // --- Security measures: Anti-theft and Anti-hack ---
        
        // 1. Disable Right Click
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        // 2. Disable common DevTool shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'u') ||
                (e.ctrlKey && e.key === 's')
            ) {
                e.preventDefault();
                return false;
            }
        };

        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);

        // --- Offline Progress Calculation ---
        const calculateOfflineProgress = () => {
            try {
                const saved = localStorage.getItem('animeSoul_save');
                if (!saved) return;
                const rawData = saved.startsWith('{') ? saved : decodeURIComponent(atob(saved));
                const parsed = JSON.parse(rawData);
                if (parsed.lastSaveTime > 0) {
                    const diff = (Date.now() - parsed.lastSaveTime) / 1000;
                    if (diff > 60) {
                        const dps = getStaticDps(parsed);
                        if (dps > 0) {
                            const efficiency = parsed.arts[6]?.owned ? 0.3 : 0.15; // Artifact bonus
                            const offlineGold = Math.floor(dps * diff * efficiency);
                            if (offlineGold > 0) {
                                setGameState(prev => ({ ...prev, gold: prev.gold + offlineGold }));
                                setTimeout(() => {
                                    (window as any).Telegram?.WebApp?.showAlert?.(`С возвращением! Добыто ${format(offlineGold)} золота за ${Math.floor(diff/60)} мин.`);
                                }, 1500);
                            }
                        }
                    }
                }
            } catch (e) { console.error("Offline calc err", e); }
        };
        calculateOfflineProgress();

    // --- Firebase Auth & Leaderboard ---
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (!isAuthReady) setIsAuthReady(true);
        
        if (user) {
            setAuthError(null);
            
            const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
            const platformId = tgUser?.id ? `tg_${tgUser.id}` : null;
            const googleUid = !user.isAnonymous ? user.uid : null;
            const identityId = googleUid || platformId || user.uid;

            setPlayerName(prev => {
                if (prev === 'Аноним') return generateGuestName(platformId || user.uid);
                return prev;
            });

            // --- Robust Multi-Account Loading & Linking ---
            try {
                const { getDoc, setDoc } = await import('firebase/firestore');
                
                // 1. Try to load from Google identity if available
                let cloudDoc = null;
                if (googleUid) cloudDoc = await getDoc(doc(db, 'users', googleUid));
                
                // 2. Try to load from Telegram identity if available
                let tgDoc = null;
                if (platformId && platformId !== googleUid) tgDoc = await getDoc(doc(db, 'users', platformId));

                const cloudData = cloudDoc?.exists() ? cloudDoc.data() : null;
                const tgData = tgDoc?.exists() ? tgDoc.data() : null;

                // Determine which save is better (higher glory or more kills)
                const getPower = (d: any) => d ? (d.glory * 1000000 + d.totalKills) : -1;
                const mainData = getPower(cloudData) >= getPower(tgData) ? cloudData : tgData;

                if (mainData && mainData.gold !== undefined) {
                    setGameState(prev => ({
                        ...prev,
                        ...mainData,
                        tgId: tgUser?.id || mainData.tgId || null,
                        googleUid: googleUid || mainData.googleUid || null,
                        updatedAt: undefined 
                    }));

                    // LINKING: If we are on Google and have better data from TG, or vice versa, sync them.
                    if (googleUid && mainData === tgData && !isQuotaExceededRef.current && !isQuotaExceededGlobal) {
                        console.log("Linking Telegram progress to Google account...");
                        await setDoc(doc(db, 'users', googleUid), { ...mainData, googleUid, tgId: tgUser?.id || null }, { merge: true });
                    }
                }
            } catch (err) {
                console.error("Cloud load error:", err);
            }
        } else {
            try {
                await signInAnonymously(auth);
            } catch (err: any) {
                console.error("Auto-anon signin failed", err);
            }
        }
    });

    const q = query(collection(db, 'leaderboard'), orderBy('powerScore', 'desc'), limit(100));
    const unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
        const rawData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        
        // Unified Ranking: Group by human identity (TG ID or Google UID)
        const uniqueUsers = new Map();

        rawData.forEach((entry: any) => {
            const name = (entry.username || 'Аноним').toLowerCase();
            const isAI = name.includes('gemini') || name.includes('ais agent') || name.includes('ais_agent');
            if (isAI) return;

            // Decision: What is the most stable unique key for this entry?
            // Prioritize TG ID, then Auth UID.
            const uniqueKey = entry.tgId ? `tg_${entry.tgId}` : entry.uid;

            if (!uniqueUsers.has(uniqueKey) || uniqueUsers.get(uniqueKey).powerScore < entry.powerScore) {
                uniqueUsers.set(uniqueKey, entry);
            }
        });

        const sortedList = Array.from(uniqueUsers.values())
            .sort((a, b) => b.powerScore - a.powerScore);

        setLeaderboard(sortedList.slice(0, 15));
        setIsLoadingLeaderboard(false);
        
        if (auth.currentUser) {
            const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
            const currentIdentity = auth.currentUser.isAnonymous && tgUser?.id ? `tg_${tgUser.id}` : auth.currentUser.uid;
            
            let myRank = sortedList.findIndex((d: any) => 
                (d.uid === auth.currentUser?.uid) || 
                (tgUser?.id && d.tgId == tgUser.id)
            );
            
            if (myRank !== -1) setUserRank(myRank + 1);
            else setUserRank(null);
        }
    }, (err) => {
        setIsLoadingLeaderboard(false);
        handleFirestoreError(err, 'LIST', 'leaderboard');
    });

        return () => {
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
            unsubscribeAuth();
            unsubscribeLeaderboard();
        };
    }, []);

    const saveState = (state: GameState) => {
        try {
            const dataToSave = { ...state, lastSaveTime: Date.now(), username: playerNameRef.current };
            localStorage.setItem('animeSoul_save', JSON.stringify(dataToSave));
        } catch (e) {}
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastClickRef.current > 1000) {
                comboRef.current = 0; // Reset combo if idle
            }
            
            setGameState(prev => {
                let next = { ...prev };
                let dps = getStaticDps(next);
                if (dps > 0) {
                    next = applyDamage(next, dps / 10, false);
                }
                if (next.buffs.frenzyUntil > now || next.buffs.autoClickerUntil > now) {
                    const { dmg } = getClickDmg(next);
                    next = applyDamage(next, dmg, false);
                    activeDpsBufRef.current += dmg * 10; // approximate for display
                }
                return next;
            });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const bossInterval = setInterval(() => {
            setGameState(prev => {
                if (prev.isBoss) {
                    if (prev.bossTime <= 1) {
                        let next = { ...prev, subStage: 1 };
                        return spawnMonster(next);
                    }
                    return { ...prev, bossTime: prev.bossTime - 1 };
                }
                return prev;
            });
        }, 1000);
        return () => clearInterval(bossInterval);
    }, []);

    useEffect(() => {
        const dpsInterval = setInterval(() => {
            setLastActiveDps(activeDpsBufRef.current);
            activeDpsBufRef.current = 0;

            const staticDps = getStaticDps(gameStateRef.current);
            if (staticDps > 0) {
                const el = document.getElementById('monster-container');
                if (el) {
                    const rect = el.getBoundingClientRect();
                    const id = popupIdRef.current++;
                    const scatterX = (Math.random() - 0.5) * 60;
                    const scatterY = (Math.random() - 0.5) * 60;
                    setDamagePopups(pop => [...pop, { 
                        id, 
                        val: staticDps, 
                        x: rect.left + rect.width / 2 + scatterX, 
                        y: rect.top + rect.height / 2 + scatterY,
                        isCrit: false
                    }]);
                    setTimeout(() => {
                        setDamagePopups(pop => pop.filter(p => p.id !== id));
                    }, 700);
                }
            }
        }, 1000);
        return () => clearInterval(dpsInterval);
    }, []);

    useEffect(() => {
        const chestInterval = setInterval(() => {
            if (Math.random() > 0.6) {
                const types: ('gold' | 'gems' | 'souls')[] = ['gold', 'gold', 'gems', 'souls'];
                setFlyingChest({
                    x: Math.random() * (window.innerWidth - 80),
                    y: Math.random() * (window.innerHeight - 80),
                    show: true,
                    type: types[Math.floor(Math.random() * types.length)]
                });
                
                setTimeout(() => {
                    setFlyingChest(prev => ({...prev, show: false}));
                }, 4000);
            }
        }, 30000); // Check every 30 seconds
        return () => clearInterval(chestInterval);
    }, []);

    const handleHit = (e?: React.MouseEvent) => {
        const now = Date.now();
        if (now - lastClickRef.current < 1000) {
            comboRef.current = Math.min(comboRef.current + 1, 100);
        } else {
            comboRef.current = 1;
        }
        lastClickRef.current = now;
        
        let comboMult = 1 + (Math.floor(comboRef.current / 10) * 0.1); // Max +1.0 (2x damage at 100 combo)
        
        const { dmg, isCrit } = getClickDmg(gameState, comboMult);
        activeDpsBufRef.current += dmg;
        
        if (e) {
            const rect = e.currentTarget.getBoundingClientRect();
            const id = popupIdRef.current++;
            const scatterX = (Math.random() - 0.5) * 40;
            const scatterY = (Math.random() - 0.5) * 40;
            setDamagePopups(prev => [...prev, { 
                id, 
                val: dmg, 
                x: rect.left + rect.width / 2 + scatterX, 
                y: rect.top + rect.height / 2 + scatterY,
                isCrit
            }]);
            setTimeout(() => {
                setDamagePopups(prev => prev.filter(p => p.id !== id));
            }, 700);
        }
        
        setGameState(prev => applyDamage(prev, dmg, true));
    };

    const clickFlyingChest = (e: React.MouseEvent) => {
        e.stopPropagation();
        setFlyingChest(prev => ({...prev, show: false}));
        
        const tg = (window as any).Telegram?.WebApp;
        
        setGameState(prev => {
            const stage = Math.floor(prev.totalKills / 5) + 1;
            let next = { ...prev };
            if (flyingChest.type === 'gold') {
                const amount = Math.floor(80 * Math.pow(1.45, stage)) * 5;
                next.gold += amount;
                tg?.showAlert?.(`Вы поймали летучую добычу! +${format(amount)} Золота`);
            } else if (flyingChest.type === 'gems') {
                next.crystals += 10;
                tg?.showAlert?.(`Вы поймали летучую добычу! +10 Кристаллов`);
            } else {
                next.souls += stage * 2;
                tg?.showAlert?.(`Вы поймали летучую добычу! +${stage * 2} Душ`);
            }
            return next;
        });
    };

    const buyMerc = (id: number) => {
        setGameState(prev => {
            const m = prev.mercs[id];
            if (m.level >= m.maxLevel) return prev;
            
            const currentLvl = Number(m.level) || 0;
            // Economy rework: Merceraries cost multiplier adjusted to 1.15
            const cost = Math.floor(m.cost * Math.pow(1.15, currentLvl));
            if (prev.gold >= cost) {
                const newMercs = [...prev.mercs];
                newMercs[id] = { ...m, level: currentLvl + 1 };
                return { ...prev, gold: prev.gold - cost, mercs: newMercs };
            }
            return prev;
        });
    };

    const upLvl = () => {
        setGameState(prev => {
            if (prev.player.lvl >= 100) return prev;
            const currentLvl = Number(prev.player.lvl) || 1;
            const cost = Math.floor(100 * Math.pow(1.15, currentLvl));
            if (prev.gold >= cost) {
                return { ...prev, gold: prev.gold - cost, player: { ...prev.player, lvl: currentLvl + 1 } };
            }
            return prev;
        });
    };

    const upGear = (g: 'sword' | 'armor' | 'ring') => {
        setGameState(prev => {
            if (prev.player.gear[g] >= 100) return prev;
            const baseCost = g === 'sword' ? 100 : g === 'armor' ? 500 : 1000;
            const multiplier = g === 'sword' ? 1.5 : g === 'armor' ? 1.6 : 1.7;
            const currentLvl = Number(prev.player.gear[g]) || 0;
            const cost = Math.floor(baseCost * Math.pow(multiplier, currentLvl));
            if (prev.gold >= cost) {
                return { 
                    ...prev, 
                    gold: prev.gold - cost, 
                    player: { ...prev.player, gear: { ...prev.player.gear, [g]: currentLvl + 1 } } 
                };
            }
            return prev;
        });
    };

    const selectHero = (id: number) => {
        setGameState(prev => {
            const h = HEROES_DATA.find(x => x.id === id);
            if (!h) return prev;
            
            if (prev.unlockedHeroes.includes(id)) {
                return { ...prev, mainHero: { id: h.id, name: h.name, ability: h.ability } };
            }
            
            if (prev.glory >= h.gloryReq && prev.gold >= h.cost && !prev.unlockedHeroes.includes(id)) {
                return { 
                    ...prev, 
                    gold: prev.gold - h.cost,
                    unlockedHeroes: [...prev.unlockedHeroes, id],
                    mainHero: { id: h.id, name: h.name, ability: h.ability }
                };
            }
            
            return prev;
        });
    };

    const useSkill = (id: number) => {
        setGameState(prev => {
            const s = prev.skills[id];
            let cdMultiplier = prev.arts[4].owned ? 0.8 : 1;
            const ready = (Date.now() - s.last) / 1000 >= (s.cd * cdMultiplier);
            if (ready) {
                const newSkills = [...prev.skills];
                newSkills[id] = { ...s, last: Date.now() };
                let next = { ...prev, skills: newSkills };
                if (id === 0) {
                    const { dmg } = getClickDmg(next);
                    next = applyDamage(next, dmg * 50, false);
                } else if (id === 1) {
                    next.buffs = { ...next.buffs, frenzyUntil: Date.now() + 5000 };
                } else if (id === 2) {
                    next.bossTime += 10;
                } else if (id === 3) {
                    const stage = Math.floor(next.totalKills / 5) + 1;
                    let rew = Math.floor((next.isBoss ? 200 : 20) * Math.pow(1.2, stage));
                    next.gold += rew * 10;
                } else if (id === 4) {
                    next.buffs = { ...next.buffs, wrathUntil: Date.now() + 10000 };
                }
                return next;
            }
            return prev;
        });
    };

    const buyArt = (id: number) => {
        setGameState(prev => {
            const a = prev.arts[id];
            if (!a.owned && prev.souls >= a.cost) {
                const newArts = [...prev.arts];
                newArts[id] = { ...a, owned: true };
                return { ...prev, souls: prev.souls - a.cost, arts: newArts };
            }
            return prev;
        });
    };

    const handlePayment = async (item: any) => {
        const tg = (window as any).Telegram?.WebApp;
        
        if (!tonConnectUI.connected) {
            await tonConnectUI.openModal();
            return;
        }

        try {
            // My Wallet: UQA211DJ_gT_WbR9J3zqO5U4pStcr_xRL2sdfGRi139lRybB
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
                messages: [
                    {
                        address: "UQA211DJ_gT_WbR9J3zqO5U4pStcr_xRL2sdfGRi139lRybB",
                        amount: (item.ton * 1e9).toString(), // convert to nanoTON
                    }
                ]
            };

            const result = await tonConnectUI.sendTransaction(transaction);
            
            if (result) {
                // Successful transaction sent
                item.action(setGameState);
                tg?.showAlert?.(`Оплата прошла успешно! Вы получили: ${item.name}`);
            }
        } catch (e) {
            console.error("Payment error", e);
            tg?.showAlert?.("Ошибка при совершении транзакции. Убедитесь, что у вас достаточно TON.");
        }
    };

    const rollGacha = () => {
        if (gameState.crystals < 100) {
            setGachaModal(prev => ({ ...prev, show: true, error: "Нужно 100 кристаллов!" }));
            setTimeout(() => setGachaModal(prev => ({ ...prev, error: null })), 2000);
            return;
        }
        if (gachaModal.spinning) return;
        
        // Weight-based selection
        const totalWeight = GACHA_PRIZES.reduce((acc, p) => acc + (p.weight || 1), 0);
        let random = Math.random() * totalWeight;
        let prizeIndex = 0;
        for (let i = 0; i < GACHA_PRIZES.length; i++) {
            random -= (GACHA_PRIZES[i].weight || 1);
            if (random <= 0) {
                prizeIndex = i;
                break;
            }
        }

        const extraSpins = 5;
        const segmentAngle = 360 / GACHA_PRIZES.length;
        const targetRotation = gachaModal.rotation + (extraSpins * 360) + (360 - (prizeIndex * segmentAngle + segmentAngle / 2) - (gachaModal.rotation % 360));

        setGameState(prev => ({ ...prev, crystals: prev.crystals - 100 }));
        setGachaModal(prev => ({ ...prev, show: true, spinning: true, prize: null, rotation: targetRotation, error: null }));
        
        setTimeout(() => {
            const prize = GACHA_PRIZES[prizeIndex];
            setGachaModal(prev => ({ ...prev, spinning: false, prize }));
        }, 3000);
    };

    const acceptGacha = () => {
        setGameState(prev => {
            let next = { ...prev };
            const prize = gachaModal.prize;
            const stage = Math.floor(prev.totalKills / 5) + 1;
            const stageGold = Math.floor(80 * Math.pow(1.45, stage)) / 12;

            let mult = prize.multiplier || 1;
            if (gameState.arts[10]?.owned) mult *= 2; // Crown of Dreams

            if (prize.type === 'souls') next.souls += prize.amount;
            if (prize.type === 'crystals') next.crystals += prize.amount;
            if (prize.type === 'gold') next.gold += prize.amount;
            
            // Dynamic rewards based on stage
            if (prize.type === 'gold_relative') next.gold += Math.floor(stageGold * mult);
            if (prize.type === 'souls_relative') next.souls += Math.floor(stage * 2 * mult);
            
            return next;
        });
        setGachaModal({ show: false, spinning: false, prize: null, rotation: 0 });
    };

    const buyAutoClicker = () => {
        setGameState(prev => {
            if (prev.crystals >= 20) {
                return {
                    ...prev,
                    crystals: prev.crystals - 20,
                    buffs: { ...prev.buffs, autoClickerUntil: Math.max(Date.now(), prev.buffs.autoClickerUntil) + 60000 }
                };
            }
            return prev;
        });
    };

    const prestige = () => {
        setGameState(prev => {
            if (prev.totalKills < 100) return prev;
            const gain = Math.floor(prev.totalKills / 25);
            if (gain >= 1 && window.confirm(`Отправиться в Исекай? Вы получите ${gain} Славы.`)) {
                let next = { ...INITIAL_STATE, glory: prev.glory + gain };
                return spawnMonster(next);
            }
            return prev;
        });
    };

    const renderTabContent = () => {
        const skillCdMult = (gameState.arts[4].owned ? 0.8 : 1) * (gameState.arts[9]?.owned ? 0.85 : 1);
        switch (activeTab) {
            case 'team':
                return (
                    <div className="flex flex-col gap-3">
                        {gameState.mercs.map((m, i) => {
                            const cost = Math.floor(m.cost * Math.pow(1.15, m.level));
                            const canBuy = gameState.gold >= cost;
                            return (
                                <div key={m.id} className="aaa-glass p-3 rounded-3xl flex flex-col gap-2 relative overflow-hidden group">
                                    <div className="absolute -left-4 -top-4 w-16 h-16 bg-gradient-to-br from-pink-300/20 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
                                    <div className="flex justify-between items-start z-10">
                                        <div className="flex gap-3 items-center">
                                            <div className="w-14 h-14 bg-[#e9e5dc] border border-red-900/50 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                                                {m.level > 0 ? (
                                                    <img 
                                                        src={`https://enka.network/ui/${GENSHIN_LOLIS[i % GENSHIN_LOLIS.length]}.png`} 
                                                        alt={INITIAL_STATE.mercs[m.id].name} 
                                                        onError={handleImageError('https://enka.network/ui/UI_AvatarIcon_Paimon.png')}
                                                        className="w-full h-full object-cover filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : (
                                                    <div className="text-2xl opacity-50">👤</div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-extrabold text-sm text-slate-700 uppercase tracking-wide">{INITIAL_STATE.mercs[m.id].name}</span>
                                                <span className="text-xs text-pink-500 font-bold">Lvl {m.level}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-purple-500 font-bold">DPS {format(m.atk * (m.level || 1))}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 z-10">
                                        <div className="flex items-center gap-1 text-yellow-500 font-bold text-sm">
                                            <Coins size={16}/> {format(cost)}
                                        </div>
                                        <button 
                                            onClick={() => buyMerc(i)}
                                            disabled={!canBuy || m.level >= m.maxLevel}
                                            className={`aaa-btn py-1.5 px-4 rounded-xl font-bold text-xs uppercase ${
                                                m.level >= m.maxLevel
                                                ? 'bg-zinc-800/50 text-yellow-500 cursor-not-allowed border-yellow-500/50'
                                                : canBuy 
                                                ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-500/50' 
                                                : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border-transparent'
                                            }`}
                                        >
                                            {m.level >= m.maxLevel ? 'MAX LEVEL' : canBuy ? `Level Up (+${format(m.atk)})` : 'Level Up'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            case 'hero':
                const hCost = Math.floor(100 * Math.pow(1.15, gameState.player.lvl));
                const sCost = Math.floor(100 * Math.pow(1.5, gameState.player.gear.sword));
                const aCost = Math.floor(500 * Math.pow(1.6, gameState.player.gear.armor));
                const rCost = Math.floor(1000 * Math.pow(1.7, gameState.player.gear.ring));
                return (
                    <div className="flex flex-col gap-3">
                        <div className="aaa-glass p-3 rounded-3xl flex flex-col gap-2 relative overflow-hidden">
                            <div className="text-red-500 font-extrabold text-xs uppercase tracking-widest z-10 text-center mb-1">Герои</div>
                            <div className="grid grid-cols-2 gap-2">
                                {HEROES_DATA.map(h => {
                                    const isUnlocked = gameState.unlockedHeroes.includes(h.id);
                                    const isSelected = gameState.mainHero.id === h.id;
                                    const canUnlock = gameState.glory >= h.gloryReq && gameState.gold >= h.cost && !isUnlocked;
                                    return (
                                        <button
                                            key={h.id}
                                            onClick={() => selectHero(h.id)}
                                            disabled={(!isUnlocked && !canUnlock) || isSelected}
                                            className={`p-2 rounded-xl flex flex-col items-center justify-center text-center gap-1 border-2 transition-all min-h-[80px] ${
                                                isSelected 
                                                ? 'border-yellow-500 bg-yellow-500/20' 
                                                : isUnlocked
                                                ? 'border-zinc-700 bg-zinc-800 hover:border-zinc-500 hover:bg-zinc-700'
                                                : canUnlock
                                                ? 'border-green-500/50 bg-green-500/10 hover:bg-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                                                : 'border-zinc-800 bg-zinc-900/50 opacity-50 cursor-not-allowed'
                                            }`}
                                        >
                                            <span className={`font-black text-xs leading-none ${h.color}`}>{h.name}</span>
                                            {isUnlocked ? (
                                                <span className="text-[9px] font-bold text-zinc-400 mt-1">{isSelected ? 'Выбран' : 'Выбрать'}</span>
                                            ) : (
                                                <div className="flex flex-col items-center text-[9px] gap-1 mt-1">
                                                    <span className={gameState.glory >= h.gloryReq ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                                        {h.gloryReq} Славы
                                                    </span>
                                                    <div className="flex items-center gap-1 text-yellow-500 font-bold">
                                                        <Coins size={10} /> {format(h.cost)}
                                                    </div>
                                                </div>
                                            )}
                                            <span className="text-[8px] text-zinc-400 font-medium leading-tight mt-auto">{h.ability}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="aaa-glass p-4 rounded-3xl flex flex-col gap-2 text-center relative overflow-hidden">
                            <div className="absolute -left-4 -top-4 w-20 h-20 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-xl"></div>
                            <div className="text-red-500 font-extrabold text-xs uppercase tracking-widest z-10">Hero Level</div>
                            <div className="text-4xl font-black text-zinc-200 my-1 drop-shadow-sm z-10">{gameState.player.lvl}{gameState.player.lvl >= 100 ? ' (MAX)' : ''}</div>
                            <div className="text-xs text-red-400 font-bold mb-2 uppercase z-10 flex items-center justify-center gap-1">
                                Click DMG: {format(getClickDmg(gameState, 1 + (comboRef.current / 10)).dmg)}
                                {comboRef.current > 0 && <span className="text-orange-500 bg-orange-500/20 px-1 rounded animate-pulse">(Combo x{(1 + comboRef.current / 10).toFixed(1)})</span>}
                            </div>
                            <button  
                                onClick={upLvl}
                                disabled={gameState.gold < hCost || gameState.player.lvl >= 100}
                                className={`aaa-btn w-full py-2.5 px-4 rounded-xl font-bold text-sm uppercase z-10 ${
                                    gameState.player.lvl >= 100
                                    ? 'bg-zinc-800/50 text-yellow-500 cursor-not-allowed border-yellow-500/50'
                                    : gameState.gold >= hCost 
                                    ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-500/50' 
                                    : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border-transparent'
                                }`}
                            >
                                <span className="flex justify-between items-center">
                                    <span>{gameState.player.lvl >= 100 ? 'MAX LEVEL' : 'Level Up (+25% DMG)'}</span>
                                    {gameState.player.lvl < 100 && <span className="flex items-center gap-1"><Coins size={16}/> {format(hCost)}</span>}
                                </span>
                            </button>
                        </div>
                        <div className="aaa-glass p-4 rounded-3xl flex flex-col gap-2 text-center relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-gradient-to-tl from-red-500/20 to-transparent rounded-full blur-xl"></div>
                            <div className="text-red-500 font-extrabold text-xs uppercase tracking-widest z-10">Star Sword</div>
                            <div className="text-3xl font-black text-zinc-200 my-1 drop-shadow-sm z-10">LV.{gameState.player.gear.sword}{gameState.player.gear.sword >= 100 ? ' (MAX)' : ''}</div>
                            <button 
                                onClick={() => upGear('sword')}
                                disabled={gameState.gold < sCost || gameState.player.gear.sword >= 100}
                                className={`aaa-btn w-full py-2.5 px-4 rounded-xl font-bold text-sm uppercase z-10 ${
                                    gameState.player.gear.sword >= 100
                                    ? 'bg-zinc-800/50 text-yellow-500 cursor-not-allowed border-yellow-500/50'
                                    : gameState.gold >= sCost 
                                    ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-500/50' 
                                    : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border-transparent'
                                }`}
                            >
                                <span className="flex justify-between items-center">
                                    <span>{gameState.player.gear.sword >= 100 ? 'MAX LEVEL' : 'Forge (+25 DMG)'}</span>
                                    {gameState.player.gear.sword < 100 && <span className="flex items-center gap-1"><Coins size={16}/> {format(sCost)}</span>}
                                </span>
                            </button>
                        </div>
                        <div className="aaa-glass p-4 rounded-3xl flex flex-col gap-2 text-center relative overflow-hidden">
                            <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-gradient-to-tr from-red-500/20 to-transparent rounded-full blur-xl"></div>
                            <div className="text-red-500 font-extrabold text-xs uppercase tracking-widest z-10">Aegis Armor</div>
                            <div className="text-3xl font-black text-zinc-200 my-1 drop-shadow-sm z-10">LV.{gameState.player.gear.armor}{gameState.player.gear.armor >= 100 ? ' (MAX)' : ''}</div>
                            <button 
                                onClick={() => upGear('armor')}
                                disabled={gameState.gold < aCost || gameState.player.gear.armor >= 100}
                                className={`aaa-btn w-full py-2.5 px-4 rounded-xl font-bold text-sm uppercase z-10 ${
                                    gameState.player.gear.armor >= 100
                                    ? 'bg-zinc-800/50 text-yellow-500 cursor-not-allowed border-yellow-500/50'
                                    : gameState.gold >= aCost 
                                    ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-500/50' 
                                    : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border-transparent'
                                }`}
                            >
                                <span className="flex justify-between items-center">
                                    <span>{gameState.player.gear.armor >= 100 ? 'MAX LEVEL' : 'Forge (+2% CRT CHANCE/10% CRT DMG)'}</span>
                                    {gameState.player.gear.armor < 100 && <span className="flex items-center gap-1"><Coins size={16}/> {format(aCost)}</span>}
                                </span>
                            </button>
                        </div>
                        <div className="aaa-glass p-4 rounded-3xl flex flex-col gap-2 text-center relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-gradient-to-bl from-red-500/20 to-transparent rounded-full blur-xl"></div>
                            <div className="text-red-500 font-extrabold text-xs uppercase tracking-widest z-10">Ring of Power</div>
                            <div className="text-3xl font-black text-zinc-200 my-1 drop-shadow-sm z-10">LV.{gameState.player.gear.ring}{gameState.player.gear.ring >= 100 ? ' (MAX)' : ''}</div>
                            <button 
                                onClick={() => upGear('ring')}
                                disabled={gameState.gold < rCost || gameState.player.gear.ring >= 100}
                                className={`aaa-btn w-full py-2.5 px-4 rounded-xl font-bold text-sm uppercase z-10 ${
                                    gameState.player.gear.ring >= 100
                                    ? 'bg-zinc-800/50 text-yellow-500 cursor-not-allowed border-yellow-500/50'
                                    : gameState.gold >= rCost 
                                    ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-500/50' 
                                    : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border-transparent'
                                }`}
                            >
                                <span className="flex justify-between items-center">
                                    <span>{gameState.player.gear.ring >= 100 ? 'MAX LEVEL' : 'Forge (+20% DPS)'}</span>
                                    {gameState.player.gear.ring < 100 && <span className="flex items-center gap-1"><Coins size={16}/> {format(rCost)}</span>}
                                </span>
                            </button>
                        </div>
                    </div>
                );
            case 'skills':
                return (
                    <div className="flex flex-col gap-3">
                        {gameState.skills.map((s, i) => {
                            const ready = (Date.now() - s.last) / 1000 >= s.cd;
                            return (
                                <div key={s.id} className="aaa-glass p-4 rounded-3xl flex flex-col gap-2 relative overflow-hidden">
                                    <div className="font-extrabold text-sm text-zinc-200 uppercase tracking-wide z-10">{s.name}</div>
                                    <div className="text-xs text-red-400 font-bold mb-2 z-10">{s.desc}</div>
                                    <button 
                                        onClick={() => useSkill(i)}
                                        disabled={!ready}
                                        className={`aaa-btn w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase z-10 ${
                                            ready 
                                            ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-500/50' 
                                            : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border-transparent'
                                        }`}
                                    >
                                        <span className="flex justify-between items-center">
                                            <span>{ready ? 'ACTIVATE' : 'COOLDOWN'}</span>
                                            <span>{ready ? s.cd : Math.max(0, Math.ceil(s.cd * skillCdMult - (Date.now() - s.last) / 1000))}s</span>
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                );
            case 'shop':
                return (
                    <div className="flex flex-col gap-3">
                        <div className="aaa-glass p-5 rounded-3xl flex flex-col gap-3 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-transparent z-0"></div>
                            <div className={`text-5xl mb-2 z-10 ${gachaModal.spinning ? 'animate-spin' : 'animate-bounce'}`}>🎰</div>
                            <div className="font-black text-xl text-yellow-500 mb-2 uppercase tracking-widest drop-shadow-sm z-10">Gacha</div>
                            <button 
                                onClick={rollGacha}
                                disabled={gameState.crystals < 100 || gachaModal.show}
                                className={`aaa-btn w-full py-3 px-4 rounded-xl font-bold text-sm uppercase z-10 ${
                                    gameState.crystals >= 100 && !gachaModal.show
                                    ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-500/50' 
                                    : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border-transparent'
                                }`}
                            >
                                <span className="flex justify-between items-center">
                                    <span>{gachaModal.spinning ? 'Rolling...' : 'Roll'}</span>
                                    <span className="flex items-center gap-1"><Gem size={16}/> 100</span>
                                </span>
                            </button>
                        </div>
                        <div className="aaa-glass p-4 rounded-3xl flex flex-col gap-2 relative overflow-hidden">
                            <div className="font-extrabold text-sm text-zinc-200 uppercase tracking-wide z-10">Auto-Clicker Potion</div>
                            <div className="text-xs text-red-400 font-bold mb-2 z-10">Auto clicks 10 times/sec for 60s</div>
                            <button 
                                onClick={buyAutoClicker}
                                disabled={gameState.crystals < 20}
                                className={`aaa-btn w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase z-10 ${
                                    gameState.crystals >= 20 
                                    ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-500/50' 
                                    : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border-transparent'
                                }`}
                            >
                                <span className="flex justify-between items-center">
                                    <span>Buy</span>
                                    <span className="flex items-center gap-1"><Gem size={16}/> 20</span>
                                </span>
                            </button>
                        </div>
                    </div>
                );
            case 'arts':
                // Check for skill cooldown reduction from relics
                return (
                    <div className="flex flex-col gap-3">
                        {gameState.arts.map((a, i) => (
                            <div key={a.id} className={`aaa-glass p-4 rounded-3xl flex flex-col gap-2 relative overflow-hidden`}>
                                <div className="font-extrabold text-sm text-zinc-200 uppercase tracking-wide z-10">{a.name}</div>
                                <div className="text-xs text-red-400 font-bold mb-2 z-10">{a.desc}</div>
                                <button 
                                    onClick={() => buyArt(i)}
                                    disabled={a.owned || gameState.souls < a.cost}
                                    className={`aaa-btn w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase z-10 ${
                                        a.owned ? 'bg-red-900/50 text-red-400 cursor-default border-red-900' :
                                        gameState.souls >= a.cost 
                                        ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-500/50' 
                                        : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border-transparent'
                                    }`}
                                >
                                    <span className="flex justify-between items-center">
                                        <span>{a.owned ? 'EQUIPPED' : 'BUY'}</span>
                                        {!a.owned && <span className="flex items-center gap-1"><Skull size={16}/> {a.cost}</span>}
                                    </span>
                                </button>
                            </div>
                        ))}
                    </div>
                );
                case 'leaderboard':
                return (
                    <div className="flex flex-col gap-3">
                        {authError && (
                            <div className="bg-red-900/40 border border-red-500 p-2 rounded-xl text-[10px] text-red-200 flex items-center justify-between font-bold">
                                <span className="flex-1 text-center">⚠️ {authError}</span>
                                <button onClick={() => setAuthError(null)} className="ml-2 text-red-400 hover:text-white">
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                        <div className="aaa-glass p-4 rounded-3xl flex flex-col gap-4 relative overflow-hidden">
                            <div className="font-extrabold text-lg text-red-500 uppercase tracking-wide z-10 text-center flex items-center justify-center gap-2">
                                <Trophy size={20} />
                                Топ Игроков
                            </div>
                            
                            <div className="flex flex-col gap-2 z-10">
                                {isLoadingLeaderboard ? (
                                    <div className="text-center py-8 text-zinc-500 font-bold animate-pulse italic">Загрузка рейтинга...</div>
                                ) : leaderboard.length === 0 ? (
                                    <div className="text-center py-8 text-zinc-500 font-bold italic">Мир еще не видел героев... Будь первым!</div>
                                ) : (
                                    leaderboard.map((p, i) => (
                                        <div key={i} className={`flex justify-between items-center p-2 rounded-xl border ${p.uid === auth.currentUser?.uid ? 'bg-red-900/40 border-red-500' : 'bg-zinc-900/50 border-red-900/30'}`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`${i < 3 ? 'text-yellow-500' : 'text-zinc-500'} font-black w-5`}>#{i + 1}</span>
                                                <span className="text-zinc-200 font-bold truncate max-w-[120px]">{p.username}</span>
                                            </div>
                                            <div className="flex flex-col items-end text-xs shrink-0">
                                                <span className="text-red-400 font-black flex items-center gap-1">
                                                    Stage {p.stage} 
                                                    {p.glory > 0 && <span className="text-orange-400 block ml-1" title="Перерождений (Слава)"><Trophy size={10} className="inline mr-0.5" />{format(p.glory)}</span>}
                                                </span>
                                                <span className="text-zinc-500 text-[10px]">{format(p.dps)} DPS</span>
                                            </div>
                                        </div>
                                    ))
                                )}

                                {userRank === null && isAuthReady && (
                                    <div className="flex justify-between items-center p-2 rounded-xl bg-red-900/20 border border-red-500/50 mt-2 opacity-80">
                                        <div className="flex items-center gap-2">
                                            <span className="text-red-400 font-bold w-5">#?</span>
                                            <span className="text-white font-bold">{playerName} (Вы)</span>
                                        </div>
                                        <div className="flex flex-col items-end text-xs shrink-0">
                                            <span className="text-red-400 font-black">Stage {Math.floor(gameState.totalKills / 5) + 1}</span>
                                            <span className="text-zinc-500 text-[10px] flex items-center gap-1">
                                                {format(getStaticDps(gameState))} DPS
                                                {gameState.buffs.wrathUntil > Date.now() && <span className="text-red-500 font-black">(x10)</span>}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="text-[9px] text-zinc-600 text-center italic mt-2 uppercase tracking-tighter">Рейтинг обновляется в реальном времени</div>
                        </div>
                    </div>
                );
            case 'prestige':
                const canPrestige = gameState.totalKills >= 100;
                return (
                    <div className="flex flex-col items-center justify-center p-8 gap-6 text-center h-full">
                        <Skull size={64} className="text-purple-500 animate-pulse" />
                        <h2 className="text-3xl font-black text-white">ИСЕКАЙ (Престиж)</h2>
                        <p className="text-zinc-400">Переродитесь, чтобы получить Славу. Слава дает постоянный бонус к урону и открывает доступ к новым Героям!</p>
                        
                        <div className="bg-zinc-900/80 p-6 rounded-2xl border border-purple-500/30 w-full max-w-md">
                            <div className="text-lg text-zinc-300 mb-2">Требуется убить монстров: <span className={canPrestige ? 'text-green-500' : 'text-red-500'}>{gameState.totalKills} / 100</span></div>
                            <div className="text-xl text-purple-400 font-bold">Вы получите: +{Math.floor(gameState.totalKills / 25)} Славы</div>
                        </div>

                        <button 
                            onClick={prestige}
                            disabled={!canPrestige}
                            className={`px-8 py-4 rounded-xl font-black text-xl uppercase tracking-widest transition-all ${canPrestige ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.5)]' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                        >
                            Переродиться
                        </button>
                    </div>
                );
            case 'donate':
                return (
                    <div className="flex flex-col gap-4">
                        <div className="aaa-glass p-6 rounded-3xl text-center bg-gradient-to-br from-blue-900/20 to-black border-blue-500/30">
                            <Wallet className="w-12 h-12 text-blue-400 mx-auto mb-2 animate-pulse" />
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">TON Shop</h2>
                            <p className="text-xs text-blue-400/70 font-bold">Поддержите разработку через TON!</p>
                            {!tonConnectUI.connected && (
                                <button 
                                    onClick={() => tonConnectUI.openModal()}
                                    className="mt-4 px-6 py-2 bg-blue-600 rounded-xl text-white font-bold text-xs uppercase"
                                >
                                    Подключить Кошелек
                                </button>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {DONATE_ITEMS.map((item) => (
                                <div key={item.id} className="aaa-glass p-4 rounded-3xl flex items-center justify-between gap-4 border-zinc-800 hover:border-blue-500/50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="text-4xl group-hover:scale-110 transition-transform">{item.icon}</div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-zinc-100 uppercase tracking-tight">{item.name}</span>
                                            <span className="text-[10px] text-zinc-500 font-bold leading-tight">{item.desc}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handlePayment(item)}
                                        className="aaa-btn py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-black flex items-center gap-1 rounded-2xl whitespace-nowrap"
                                    >
                                        {item.ton} TON
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 text-center">
                            <p className="text-[10px] text-zinc-600 font-bold italic">Оплата производится через TON Connect</p>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[100dvh] w-screen anime-bg scanlines text-zinc-200 font-sans overflow-hidden select-none relative">
            
            <aside className={`transition-all duration-300 w-full lg:w-[340px] flex-shrink-0 aaa-glass border-t-2 border-red-500 lg:border-none lg:m-4 flex flex-col z-20 shadow-2xl order-last lg:order-first ${isMobileMenuOpen ? 'h-[45dvh]' : 'h-[36px]'} lg:h-auto`}>
                <div className="bg-black/80 lg:p-2 lg:gap-2 backdrop-blur-md border-b-2 border-red-500/50 flex-shrink-0 relative">
                    <div className="anime-header text-red-500 text-center py-2 text-xl tracking-tighter hidden lg:block">Command Center</div>
                    
                    <button 
                        className="lg:hidden w-full flex items-center justify-center gap-2 py-2 text-red-500 font-display text-xs tracking-widest bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        {isMobileMenuOpen ? 'HIDE COMMAND CENTER' : 'SHOW COMMAND CENTER'}
                    </button>

                    <div className={`p-1 lg:p-0 flex gap-1 lg:mt-1 overflow-x-auto custom-scrollbar pb-1 transition-all ${isMobileMenuOpen ? 'flex' : 'hidden lg:flex'}`}>
                        {TABS.slice(0, 3).map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 min-w-[80px] flex flex-col items-center justify-center gap-1 py-2 lg:py-3 transition-all duration-300 ${
                                    activeTab === tab.id 
                                    ? 'bg-red-600 text-white skew-x-[-10deg] scale-105 z-10 shadow-[2px_2px_0_#450a0a]' 
                                    : 'text-zinc-500 hover:bg-zinc-800'
                                }`}
                            >
                                <tab.icon size={18} />
                                <span className="text-[10px] font-black uppercase italic tracking-wider">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/40 ${isMobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
                    {renderTabContent()}
                </div>
            </aside>

            <main className="flex-1 flex flex-col relative z-10 p-1 lg:p-4 overflow-hidden">
                <div className="aaa-glass lg:mt-4 mt-1 flex flex-col lg:flex-row items-center justify-between p-2 lg:px-8 z-10 border-red-500/60 shadow-[0_4px_20px_rgba(239,68,68,0.2)] gap-2">
                    <div className="flex items-center justify-center lg:justify-start gap-3 lg:gap-10 w-full lg:w-auto order-2 lg:order-1">
                        <div className="flex flex-col text-center lg:text-left">
                            <span className="text-[8px] lg:text-[10px] text-zinc-500 font-black anime-header uppercase">Total DPS</span>
                            <div className="text-sm lg:text-3xl font-display text-white tracking-widest flex items-center gap-2">
                                {format(getStaticDps(gameState))}
                                {gameState.buffs.wrathUntil > Date.now() && (
                                    <span className="text-[10px] lg:text-base text-red-500 font-black animate-pulse bg-red-500/20 px-2 py-0.5 rounded border border-red-500/50">x10 ГНЕВ</span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col text-center lg:text-left">
                            <span className="text-[8px] lg:text-[10px] text-yellow-500 font-black anime-header uppercase">Gold</span>
                            <div className="text-sm lg:text-3xl font-display text-yellow-500 flex items-center gap-1 justify-center lg:justify-start">{format(gameState.gold)} <Coins size={14} className="lg:w-4 lg:h-4"/></div>
                        </div>
                    </div>
                    
                    <div className="text-center w-full lg:w-auto order-1 lg:order-2 lg:absolute lg:left-1/2 lg:-translate-x-1/2 flex flex-col items-center justify-center">
                        <div className="bg-red-600 px-4 lg:px-6 py-1 text-white font-display text-base lg:text-2xl skew-x-[-15deg] shadow-[4px_4px_0px_#7f1d1d]">
                            STAGE {Math.floor(gameState.totalKills/5)+1}-{gameState.subStage}
                        </div>
                    </div>

                    <div className="flex items-center justify-center lg:justify-end gap-3 lg:gap-6 w-full lg:w-auto order-3 mt-1 lg:mt-0 py-1 lg:py-0 border-t lg:border-none border-white/5">
                        <div className="flex flex-col items-center lg:items-end text-zinc-400">
                            <span className="text-[8px] lg:text-[10px] font-black anime-header">Rank</span>
                            <div className="text-lg lg:text-2xl font-display flex items-center gap-1">#{userRank || '?'}</div>
                        </div>
                        <div className="flex flex-col items-center lg:items-end text-orange-400 group relative cursor-help">
                            <span className="text-[8px] lg:text-[10px] font-black anime-header">Glory</span>
                            <div className="text-lg lg:text-2xl font-display flex items-center gap-1 lg:gap-2">{format(gameState.glory)} <Trophy size={14} className="lg:w-4 lg:h-4"/></div>
                            <div className="absolute lg:right-[110%] top-full lg:top-0 w-48 p-2 bg-black/95 border border-orange-500/50 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100]">
                                Слава увеличивает ваш урон на 10% за каждую единицу, и открывает новых героев!
                            </div>
                        </div>
                        <div className="flex flex-col items-center lg:items-end">
                            <span className="text-[8px] lg:text-[10px] text-blue-400 font-black anime-header">Crystals</span>
                            <div className="text-lg lg:text-2xl font-display text-blue-400 flex items-center gap-1 lg:gap-2">{format(gameState.crystals)} <Gem size={14} className="lg:w-4 lg:h-4"/></div>
                        </div>
                        <div className="flex flex-col items-center lg:items-end text-purple-400">
                            <span className="text-[8px] lg:text-[10px] text-purple-400 font-black anime-header">Souls</span>
                            <div className="text-lg lg:text-2xl font-display text-purple-400 flex items-center gap-1 lg:gap-2">{format(gameState.souls)} <Skull size={14} className="lg:w-4 lg:h-4"/></div>
                        </div>

                                <button 
                                    onClick={() => {
                                        const tg = (window as any).Telegram?.WebApp;
                                        const text = encodeURIComponent(`Я на STAGE ${Math.floor(gameState.totalKills/5)+1} в AnimeSoul! Присоединяйся к битве!`);
                                        const url = encodeURIComponent(`https://t.me/YourBotUser`); // User should replace this with their actual bot link
                                        const shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;
                                        
                                        if (tg) {
                                            tg.openTelegramLink(shareUrl);
                                        } else {
                                            window.open(shareUrl, '_blank');
                                        }
                                    }}
                                    className="flex flex-col items-center lg:items-end text-green-400 hover:text-green-300 transition-colors"
                                >
                                    <span className="text-[8px] lg:text-[10px] font-black anime-header">Share</span>
                                    <div className="text-lg lg:text-2xl font-display flex items-center gap-1 lg:gap-2">
                                        <Share size={14} className="lg:w-4 lg:h-4"/>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => {
                                        setNewName(playerName);
                                        setIsSettingsOpen(true);
                                    }}
                                    className="flex flex-col items-center lg:items-end text-zinc-400 hover:text-zinc-200 transition-colors"
                                >
                                    <span className="text-[8px] lg:text-[10px] font-black anime-header">Setups</span>
                                    <div className="text-lg lg:text-2xl font-display flex items-center gap-1 lg:gap-2">
                                        <Settings size={14} className="lg:w-4 lg:h-4"/>
                                    </div>
                                </button>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2 lg:gap-3 py-2 lg:py-4 z-10 w-full shrink-0">
                    {TABS.slice(3).map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setIsMobileMenuOpen(true);
                            }}
                            className={`flex items-center justify-center gap-1 lg:gap-2 px-3 lg:px-6 py-1.5 lg:py-2 transition-all font-black text-[10px] lg:text-xs uppercase italic skew-x-[-12deg] ${
                                activeTab === tab.id 
                                ? 'bg-red-600 text-white border-2 border-white shadow-[4px_4px_0_#450a0a]' 
                                : 'bg-black/50 text-zinc-500 hover:bg-zinc-800'
                            }`}
                        >
                            <tab.icon size={16} className={`hidden sm:block ${activeTab === tab.id ? 'text-white' : 'text-zinc-500'}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center relative z-10 min-h-[300px]">
                    <div className="absolute top-2 lg:top-4 flex flex-col items-center w-full px-2 lg:px-0">
                        <div className="flex items-center gap-2 mb-2 lg:mb-4 bg-black/60 px-4 py-1 rounded-full border border-white/5 backdrop-blur-md">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <div 
                                    key={s} 
                                    className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full transition-all duration-300 border ${
                                        gameState.subStage === s 
                                        ? 'bg-red-500 border-red-400 scale-125 shadow-[0_0_10px_rgba(239,68,68,0.8)]' 
                                        : gameState.subStage > s 
                                        ? 'bg-red-900 border-red-800' 
                                        : 'bg-zinc-800 border-zinc-700'
                                    }`}
                                />
                            ))}
                            <div className="ml-2 text-[10px] font-black text-white italic uppercase tracking-widest">{gameState.isBoss ? 'BOSS' : `WAVE ${gameState.subStage}/5`}</div>
                        </div>

                        <div className="w-full max-w-[600px] h-6 lg:h-10 aaa-glass aaa-hp-bar overflow-hidden relative border-red-600/50 mb-2 lg:mb-4 transition-all duration-300">
                            <motion.div 
                                className={`h-full bg-gradient-to-r ${gameState.isBoss ? 'from-red-600 via-orange-500 to-red-400' : 'from-red-600 via-red-500 to-red-400'}`}
                                initial={false}
                                animate={{ width: `${Math.max(0, (gameState.enemy.hp / gameState.enemy.max) * 100)}%` }}
                                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-sm lg:text-xl font-display text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] italic tracking-tighter">
                                {format(gameState.enemy.hp)} / {format(gameState.enemy.max)}
                                {gameState.isBoss && <span className="ml-4 text-orange-400">🔥</span>}
                            </div>
                        </div>

                        {gameState.isBoss && (
                            <motion.div 
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="bg-red-900/80 border-2 border-red-500 px-4 py-1 rounded-full text-white font-display text-xl shadow-[0_0_20px_#ef4444] backdrop-blur-md mb-2"
                            >
                                <span className={gameState.bossTime <= 5 ? 'animate-pulse text-yellow-400' : ''}>
                                    {Math.floor(gameState.bossTime)}s
                                </span>
                            </motion.div>
                        )}

                        <h3 className="text-xl lg:text-3xl font-display text-white mb-1 lg:mb-2 italic tracking-widest bg-gradient-to-r from-red-900/60 via-red-950/80 to-transparent pr-4 lg:pr-8 pl-4 lg:pl-6 py-1 lg:py-2 border-l-2 lg:border-l-4 border-red-600 shadow-xl text-center self-center drop-shadow-md">
                            {gameState.enemy.name}
                        </h3>
                    </div>

                    <div className="flex items-center justify-between lg:justify-center mt-12 md:mt-20 lg:mt-24 w-full px-2 lg:px-0 min-h-[180px] lg:min-h-[340px]">
                        <div className="relative transition-all duration-500 hover:scale-105 shrink-0 flex-1 flex justify-end">
                            <HeroPortrait level={gameState.player.lvl} heroId={gameState.mainHero.id} />
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 lg:gap-4 group shrink-0 w-12 sm:w-16 lg:w-32 z-10 self-center">
                            <div className="text-3xl lg:text-7xl font-display text-white italic drop-shadow-[0_0_20px_#ef4444] animate-pulse">VS</div>
                            <div className="h-0.5 w-12 lg:w-24 bg-red-600 group-hover:w-16 lg:group-hover:w-32 transition-all duration-300 hidden lg:block"></div>
                        </div>

                        <motion.div 
                            id="monster-container"
                            className={`cursor-pointer relative transition-all duration-500 hover:scale-105 shrink-0 flex-1 flex justify-start ${gameState.isBoss ? 'animate-pulse-glow' : ''}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95, rotate: (Math.random() - 0.5) * 15 }}
                            onClick={handleHit}
                        >
                            <MonsterPortrait isBoss={gameState.isBoss} kills={gameState.totalKills} name={gameState.enemy.name} />
                        </motion.div>
                    </div>
                </div>

                <div className="h-28 lg:h-32 mt-4 lg:mb-4 relative z-10 flex items-end justify-start lg:justify-center pb-2 lg:pb-4 gap-2 lg:gap-4 overflow-x-auto overflow-y-hidden custom-scrollbar px-2 lg:px-4 w-full lg:max-w-5xl mx-auto shrink-0 flex-nowrap">
                    {gameState.mercs.filter(m => m.level > 0).map((m, i) => (
                        <div key={m.id} className="shrink-0 flex-none h-full">
                            <TeamAvatar index={i} level={m.level} name={INITIAL_STATE.mercs[m.id].name} />
                        </div>
                    ))}
                </div>

                <AnimatePresence>
                    {damagePopups.map(popup => (
                        <motion.div
                            key={popup.id}
                            initial={{ opacity: 1, y: popup.y, x: popup.x, scale: popup.isCrit ? 0.8 : 0.5 }}
                            animate={{ opacity: 0, y: popup.y - 120, scale: popup.isCrit ? 1.8 : 1.2 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={`fixed pointer-events-none font-black z-50 ${popup.isCrit ? 'text-yellow-400 text-5xl' : 'text-red-500 text-4xl'}`}
                            style={{ 
                                left: 0,
                                top: 0,
                                marginLeft: '-2rem',
                                WebkitTextStroke: popup.isCrit ? '2px #b45309' : '2px #450a0a',
                                textShadow: popup.isCrit ? '0 4px 15px rgba(234,179,8,1)' : '0 4px 8px rgba(220,38,38,0.8)'
                            }}
                        >
                            {popup.isCrit && <span className="absolute -top-6 -left-4 text-sm text-yellow-200" style={{WebkitTextStroke: 0}}>CRITICAL!</span>}
                            {popup.isCrit ? '💥 ' : ''}{format(popup.val)}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Gacha Modal Overlay */}
                <AnimatePresence>
                    {isSettingsOpen && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 lg:p-0"
                            onClick={() => setIsSettingsOpen(false)}
                        >
                            <motion.div 
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="w-full max-w-sm aaa-glass p-6 rounded-[2.5rem] border-red-500/30 flex flex-col gap-6 relative"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="text-center">
                                    <h2 className="text-3xl font-black text-red-500 italic uppercase">Настройки</h2>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Control Center</p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black text-zinc-400 uppercase ml-2">Имя Игрока</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                value={newName} 
                                                onChange={e => setNewName(e.target.value.slice(0, 20))}
                                                className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl py-3 px-4 text-zinc-100 font-bold focus:border-red-500 outline-none transition-all pr-12"
                                                placeholder="Введите имя..."
                                            />
                                            <button 
                                                onClick={() => {
                                                    if (newName.trim()) {
                                                        setPlayerName(newName.trim());
                                                        (window as any).Telegram?.WebApp?.showAlert?.("Имя успешно изменено!");
                                                    }
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center text-white"
                                            >
                                                <Check size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleGoogleSignIn} 
                                        disabled={!isAuthReady || (auth.currentUser && !auth.currentUser.isAnonymous)}
                                        className={`p-2 rounded w-full mt-2 font-black uppercase text-xs transition-all ${
                                            !isAuthReady 
                                            ? 'bg-zinc-800 text-zinc-600 cursor-wait'
                                            : (auth.currentUser && !auth.currentUser.isAnonymous) 
                                                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-50' 
                                                : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                                        }`}
                                    >
                                        {!isAuthReady 
                                            ? 'Загрузка...' 
                                            : (auth.currentUser && !auth.currentUser.isAnonymous) 
                                                ? 'Аккаунт привязан' 
                                                : 'Привязать Google Аккаунт'}
                                    </button>

                                    {isAdmin && (
                                        <div className="flex flex-col gap-2 mt-4 p-4 border-2 border-red-500/50 rounded-3xl bg-red-950/20">
                                            <div className="text-[10px] font-black text-red-500 uppercase text-center mb-1">Owner Dashboard</div>
                                            
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <button onClick={() => adminCommands.addGold()} className="bg-yellow-600/30 border border-yellow-500/50 p-2 rounded-xl text-[10px] font-bold text-yellow-500 hover:bg-yellow-600/50">+1T Gold</button>
                                                <button onClick={() => adminCommands.addSouls()} className="bg-purple-600/30 border border-purple-500/50 p-2 rounded-xl text-[10px] font-bold text-purple-400 hover:bg-purple-600/50">+10k Souls</button>
                                                <button onClick={() => adminCommands.addCrystals()} className="bg-blue-600/30 border border-blue-500/50 p-2 rounded-xl text-[10px] font-bold text-blue-400 hover:bg-blue-600/50">+5k Gems</button>
                                                <button onClick={() => adminCommands.addGlory()} className="bg-orange-600/30 border border-orange-500/50 p-2 rounded-xl text-[10px] font-bold text-orange-400 hover:bg-orange-600/50">+100 Glory</button>
                                            </div>

                                            <button 
                                                onClick={() => adminCommands.skipStages()}
                                                className="w-full py-2 bg-zinc-800 border border-zinc-700 rounded-xl font-bold text-[10px] uppercase text-zinc-300 hover:bg-zinc-700 mb-1"
                                            >
                                                Skip 10 Stages
                                            </button>

                                            <button 
                                                onClick={() => adminCommands.resetCooldowns()}
                                                className="w-full py-2 bg-zinc-800 border border-zinc-700 rounded-xl font-bold text-[10px] uppercase text-zinc-300 hover:bg-zinc-700 mb-1"
                                            >
                                                Reset Cooldowns
                                            </button>

                                            <button 
                                                onClick={() => adminCommands.maxEverything()}
                                                className="w-full py-2 bg-gradient-to-r from-red-600 to-purple-600 rounded-xl font-black text-[10px] uppercase text-white shadow-lg mb-3"
                                            >
                                                God Mode (MAX ALL)
                                            </button>

                                            <hr className="border-red-500/20 mb-3" />

                                            <button 
                                                onClick={globalLeaderboardCleanup}
                                                disabled={isCleaning}
                                                className={`w-full py-3 rounded-2xl font-black text-xs uppercase transition-all ${
                                                    isCleaning 
                                                    ? 'bg-zinc-800 text-zinc-500 animate-pulse' 
                                                    : 'bg-red-600 text-white hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                                                }`}
                                            >
                                                {isCleaning ? 'Cleaning...' : 'Leaderboard Audit'}
                                            </button>
                                        </div>
                                    )}

                                    {auth.currentUser ? (
                                        <div className="flex items-center gap-2 text-green-500 font-bold text-xs mt-2 justify-center">
                                            <Check size={14} /> 
                                            <span>{auth.currentUser.email || "Авторизован"}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs mt-2 justify-center">
                                            <X size={14} />
                                            <span>Не авторизован</span>
                                        </div>
                                    )}

                                        <div className="text-xs font-black text-zinc-400 uppercase mb-1 flex items-center gap-2">
                                            <RotateCcw size={12} /> Опасная зона
                                        </div>
                                        <button 
                                            onClick={() => {
                                                if (window.confirm("ВЫ УВЕРЕНЫ? ВЕСЬ ПРОГРЕСС БУДЕТ УДАЛЕН НАВСЕГДА!")) {
                                                    localStorage.removeItem('animeSoul_save');
                                                    window.location.reload();
                                                }
                                            }}
                                            className="w-full py-2 bg-red-900/40 border border-red-500/50 text-red-100 font-black text-[10px] uppercase tracking-tighter rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            Сбросить весь прогресс
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => setIsSettingsOpen(false)}
                                        className="absolute -top-4 -right-4 w-10 h-10 bg-zinc-800 border-2 border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:border-red-500 transition-all shadow-xl"
                                    >
                                        <X size={20} />
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}

                        {gachaModal.show && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                            >
                                <motion.div 
                                    initial={{ scale: 0.8, y: 50 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.8, y: 50 }}
                                    className="aaa-glass-dark p-6 lg:p-8 rounded-3xl flex flex-col items-center gap-6 w-[95%] max-w-[384px] relative overflow-hidden border-red-500/50"
                                >
                                <div className="text-2xl lg:text-3xl font-black text-yellow-500 uppercase tracking-widest z-10 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">Gacha Wheel</div>
                                
                                {gachaModal.error && (
                                    <div className="absolute top-16 left-0 w-full text-center text-red-500 font-black text-sm z-50 animate-bounce">
                                        {gachaModal.error}
                                    </div>
                                )}

                                <button 
                                    onClick={() => setGachaModal(prev => ({ ...prev, show: false }))}
                                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <ArrowRight className="rotate-180" size={24} />
                                </button>
                                
                                <div className="relative w-48 h-48 lg:w-64 lg:h-64 flex items-center justify-center z-10 mb-2 lg:mb-4 mt-2">
                                    <div className="absolute inset-0 rounded-full border-[6px] lg:border-[8px] border-zinc-800 shadow-[0_0_30px_rgba(234,179,8,0.3)] z-0 pointer-events-none"></div>

                                    {/* Pointer */}
                                    <div className="absolute -top-3 lg:-top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] lg:border-l-[12px] border-r-[10px] lg:border-r-[12px] border-t-[20px] lg:border-t-[24px] border-l-transparent border-r-transparent border-t-red-500 z-30 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"></div>
                                    
                                    {/* Wheel */}
                                    <motion.div 
                                        className="w-full h-full rounded-full overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]"
                                        animate={{ rotate: gachaModal.rotation }}
                                        transition={{ duration: 3, ease: [0.2, 0.8, 0.2, 1] }}
                                        style={{ 
                                            background: `conic-gradient(${GACHA_PRIZES.map((p, i) => `${p.color} ${i * (360/GACHA_PRIZES.length)}deg ${(i+1) * (360/GACHA_PRIZES.length)}deg`).join(', ')})`
                                        }}
                                    >
                                        {GACHA_PRIZES.map((prize, i) => (
                                            <div 
                                                key={i} 
                                                className="absolute inset-0 flex items-start justify-center pt-3 lg:pt-5 text-[8px] lg:text-[10px] font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
                                                style={{ transform: `rotate(${i * (360/GACHA_PRIZES.length) + (360/GACHA_PRIZES.length)/2}deg)` }}
                                            >
                                                {prize.text}
                                            </div>
                                        ))}
                                    </motion.div>

                                    {/* Center Dot */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 lg:w-16 lg:h-16 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-full border-[3px] lg:border-4 border-yellow-500 z-20 shadow-lg flex items-center justify-center">
                                        <Gem className="text-yellow-500 w-4 h-4 lg:w-6 lg:h-6 opacity-80" />
                                    </div>
                                </div>

                                {!gachaModal.spinning && gachaModal.prize && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col items-center gap-3 z-10 w-full"
                                    >
                                        <div className={`text-xl font-black text-center text-white drop-shadow-md`}>
                                            Приз: {gachaModal.prize.text}
                                        </div>
                                        <div className="text-xs text-yellow-500 font-bold uppercase tracking-wider mb-1">
                                            {gachaModal.prize.desc}
                                        </div>
                                        <div className="flex gap-2 w-full">
                                            <button 
                                                onClick={acceptGacha}
                                                className="aaa-btn flex-1 py-3 rounded-xl font-bold text-sm uppercase bg-zinc-800 border-zinc-700"
                                            >
                                                Забрать
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    // Add prize first then roll again
                                                    const prize = gachaModal.prize;
                                                    setGameState(prev => {
                                                        let next = { ...prev };
                                                        const stage = Math.floor(prev.totalKills / 5) + 1;
                                                        const stageGold = Math.floor(80 * Math.pow(1.45, stage)) / 12;

                                                        let mult = prize.multiplier || 1;
                                                        if (prev.arts[10]?.owned) mult *= 2; // Crown of Dreams

                                                        if (prize.type === 'souls') next.souls += prize.amount;
                                                        if (prize.type === 'crystals') next.crystals += prize.amount;
                                                        if (prize.type === 'gold') next.gold += prize.amount;
                                                        if (prize.type === 'gold_relative') next.gold += Math.floor(stageGold * mult);
                                                        if (prize.type === 'souls_relative') next.souls += Math.floor(stage * 2 * mult);

                                                        return next;
                                                    });
                                                    rollGacha();
                                                }}
                                                className="aaa-btn flex-1 py-3 rounded-xl font-bold text-sm uppercase bg-red-600 border-red-500"
                                            >
                                                Еще раз
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
