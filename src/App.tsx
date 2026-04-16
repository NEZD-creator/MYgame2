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
import { Coins, Gem, Sparkles, Users, Sword, Zap, ShoppingBag, Skull, Trophy, ArrowRight, ChevronUp, ChevronDown, Share } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, ContactShadows, Sparkles as DreiSparkles, Outlines } from '@react-three/drei';
import * as THREE from 'three';

import { auth, db, signInAnonymously, onAuthStateChanged, collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp, handleFirestoreError } from './firebase';

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
    arts: { id: number; name: string; desc: string; cost: number; owned: boolean }[];
    enemy: { hp: number; max: number; name: string };
    buffs: {
        frenzyUntil: number;
        autoClickerUntil: number;
        wrathUntil: number;
    };
};

const INITIAL_STATE: GameState = {
    gold: 100, souls: 0, crystals: 50, glory: 0,
    totalKills: 0, subStage: 1, isBoss: false, bossTime: 30,
    player: { lvl: 1, gear: { sword: 1, armor: 1, wings: 0, ring: 0 } },
    buffs: { frenzyUntil: 0, autoClickerUntil: 0, wrathUntil: 0 },
    mercs: [
        { id:0, name:'Сквайр', atk:5, cost:20, level:0, maxLevel: 100 },
        { id:1, name:'Лучник', atk:22, cost:150, level:0, maxLevel: 100 },
        { id:2, name:'Маг', atk:95, cost:800, level:0, maxLevel: 100 },
        { id:3, name:'Самурай', atk:450, cost:4500, level:0, maxLevel: 100 },
        { id:4, name:'Паладин', atk:1800, cost:22000, level:0, maxLevel: 100 },
        { id:5, name:'Ассасин', atk:8500, cost:150000, level:0, maxLevel: 100 },
        { id:6, name:'Призыватель', atk:42000, cost:900000, level:0, maxLevel: 100 },
        { id:7, name:'Дракон', atk:250000, cost:5000000, level:0, maxLevel: 100 },
        { id:8, name:'Фея', atk:1200000, cost:25000000, level:0, ability:'+10% к золоту', maxLevel: 100 },
        { id:9, name:'Котик', atk:5000000, cost:100000000, level:0, ability:'+5% к шансу двойных душ', maxLevel: 100 },
        { id:10, name:'Слизень', atk:20000000, cost:500000000, level:0, ability:'+5% к урону', maxLevel: 100 },
        { id:11, name:'Призрак', atk:80000000, cost:2500000000, level:0, ability:'+5% к урону', maxLevel: 100 },
        { id:12, name:'Робот', atk:350000000, cost:12000000000, level:0, ability:'+5% к урону', maxLevel: 100 },
        { id:13, name:'Демон', atk:1500000000, cost:60000000000, level:0, ability:'+5% к урону', maxLevel: 100 },
        { id:14, name:'Ангел', atk:7000000000, cost:300000000000, level:0, ability:'+5% к урону', maxLevel: 100 },
        { id:15, name:'Бог', atk:30000000000, cost:1500000000000, level:0, ability:'+5% к урону', maxLevel: 100 },
        { id:16, name:'Титан', atk:150000000000, cost:7500000000000, level:0, ability:'+5% к урону', maxLevel: 100 },
        { id:17, name:'Вселенная', atk:800000000000, cost:40000000000000, level:0, ability:'+5% к урону', maxLevel: 100 }
    ],
    mainHero: { id: 0, name: 'Воин', ability: 'Базовый' },
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
        { id:4, name:'Песочные Часы', desc:'-20% КД Навыков', cost:2000, owned:false }
    ],
    enemy: { hp: 100, max: 100, name: 'Слайм' }
};

const HEROES_DATA = [
    { id: 0, name: 'Воин', ability: 'Никаких бонусов', gloryReq: 0, cost: 0, color: 'text-zinc-400' },
    { id: 1, name: 'Ассасин', ability: '+20% Критический урон', gloryReq: 5, cost: 50000, color: 'text-green-500' },
    { id: 2, name: 'Странник', ability: '+50% Базовый урон', gloryReq: 20, cost: 1000000, color: 'text-purple-500' },
    { id: 3, name: 'Владыка', ability: 'x2 Общий урон', gloryReq: 100, cost: 500000000, color: 'text-red-500' },
];

function getClickDmg(state: GameState) {
    let dmg = (15 + state.player.gear.sword * 25) * (1 + state.player.lvl * 0.25);
    dmg *= (1 + state.glory * 0.1);
    
    if (state.mainHero.id === 2) dmg *= 1.5;
    
    // Calculate critical hit
    const critChance = 0.05 + state.player.gear.armor * 0.02; // Base 5% + 2% per armor level
    let critMultiplier = 2 + state.player.gear.armor * 0.1; // Base 200% + 10% per armor level
    if (state.mainHero.id === 1) critMultiplier += 0.2;
    
    if (Math.random() < critChance) {
        dmg *= critMultiplier;
    }

    if (state.mainHero.id === 3) dmg *= 2;
    if(state.arts[1].owned) dmg *= 2;
    
    if (state.buffs.wrathUntil > Date.now()) dmg *= 10;
    return Math.floor(dmg);
}

function getStaticDps(state: GameState) {
    let dps = 0;
    state.mercs.forEach(m => dps += m.atk * m.level);
    dps *= (1 + state.player.gear.ring * 0.2); // Ring boosts DPS
    dps *= (1 + state.glory * 0.1);
    if(state.arts[3].owned) dps *= 2;
    if (state.mainHero.id === 3) dps *= 2;
    
    if (state.buffs.wrathUntil > Date.now()) dps *= 10;
    return Math.floor(dps);
}

function spawnMonster(state: GameState): GameState {
    const stage = Math.floor(state.totalKills / 5) + 1;
    const isBoss = (state.subStage === 5);
    let maxHp = isBoss ? Math.floor(500 * Math.pow(1.25, stage)) : Math.floor(100 * Math.pow(1.25, stage));
    let bTime = 30;
    if (state.arts[2].owned) bTime += 5;
    
    const prefixes = ['Теневой', 'Кровавый', 'Пустотный', 'Адский', 'Древний', 'Хаотичный', 'Призрачный', 'Темный', 'Алый', 'Механический'];
    const names = ['Слайм', 'Бестия', 'Демон', 'Дракон', 'Голем', 'Призрак', 'Странник', 'Охотник', 'Разрушитель', 'Скелет'];
    const bossNames = ['Повелитель Тьмы', 'Кровавый Император', 'Пожиратель Миров', 'Бог Войны', 'Великий Дракон'];
    
    const randomName = prefixes[Math.floor(Math.random() * prefixes.length)] + ' ' + names[Math.floor(Math.random() * names.length)];
    const randomBoss = bossNames[Math.floor(Math.random() * bossNames.length)];

    return {
        ...state,
        isBoss,
        bossTime: bTime,
        enemy: {
            hp: maxHp,
            max: maxHp,
            name: isBoss ? randomBoss : randomName
        }
    };
}

function applyDamage(state: GameState, amt: number, isClick: boolean): GameState {
    let newState = { ...state, enemy: { ...state.enemy, hp: state.enemy.hp - amt } };
    
    if (newState.enemy.hp <= 0) {
        const stage = Math.floor(newState.totalKills / 5) + 1;
        let rew = Math.floor((newState.isBoss ? 200 : 20) * Math.pow(1.22, stage));
        if(newState.arts[0].owned) rew *= 2;
        newState.gold += rew;
        
        newState.totalKills++;
        if(newState.isBoss) {
            newState.subStage = 1;
            newState.crystals += 5;
        } else {
            newState.subStage++;
        }
        newState = spawnMonster(newState);
    }
    return newState;
}

function format(n: number) {
    if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
    return Math.floor(n).toString();
}

const TABS = [
    { id: 'team', label: 'Команда', icon: Users },
    { id: 'hero', label: 'Протагонист', icon: Sword },
    { id: 'skills', label: 'Навыки', icon: Zap },
    { id: 'shop', label: 'Магазин', icon: ShoppingBag },
    { id: 'arts', label: 'Реликвии', icon: Gem },
    { id: 'leaderboard', label: 'Рейтинг', icon: Trophy },
    { id: 'prestige', label: 'Исекай', icon: Skull },
];

function HeroModel({ id = 0 }: { id?: number }) {
    const swordRef = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (swordRef.current) {
            swordRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 3) * 0.2;
        }
    });

    const colors = {
        0: { primary: '#111827', secondary: '#374151', glow: '#ef4444', cape: '#7f1d1d' }, // Warrior
        1: { primary: '#064e3b', secondary: '#0f766e', glow: '#10b981', cape: '#022c22' }, // Assassin
        2: { primary: '#475569', secondary: '#94a3b8', glow: '#a855f7', cape: '#4c1d95' }, // Wanderer
        3: { primary: '#450a0a', secondary: '#991b1b', glow: '#eab308', cape: '#000000' }  // Lord
    }[id] || { primary: '#111827', secondary: '#374151', glow: '#ef4444', cape: '#7f1d1d' };

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <group position={[0, -1, 0]} scale={0.8}>
                {/* Legs */}
                <mesh position={[-0.3, 0.6, 0]} castShadow receiveShadow>
                    <capsuleGeometry args={[0.15, 0.9, 4, 16]}/>
                    <meshToonMaterial color={colors.secondary}/>
                    <Outlines thickness={0.02} color="black" />
                </mesh>
                <mesh position={[0.3, 0.6, 0]} castShadow receiveShadow>
                    <capsuleGeometry args={[0.15, 0.9, 4, 16]}/>
                    <meshToonMaterial color={colors.secondary}/>
                    <Outlines thickness={0.02} color="black" />
                </mesh>

                {/* Cape */}
                <mesh position={[0, 1.8, -0.5]} rotation={[0.2, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[1.4, 2.8, 0.05]} />
                    <meshToonMaterial color={colors.cape} />
                    <Outlines thickness={0.02} color="black" />
                </mesh>
                
                {/* Torso */}
                <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
                    <capsuleGeometry args={[0.5, 0.8, 4, 16]} />
                    <meshToonMaterial color={colors.primary} />
                    <Outlines thickness={0.02} color="black" />
                </mesh>

                {/* Chest Plate */}
                <mesh position={[0, 1.9, 0.35]} castShadow receiveShadow>
                    <boxGeometry args={[0.8, 0.7, 0.2]} />
                    <meshToonMaterial color={colors.primary} />
                    <Outlines thickness={0.02} color="black" />
                </mesh>
                {/* Core Glow */}
                <mesh position={[0, 1.9, 0.46]}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshToonMaterial color={colors.glow} emissive={colors.glow} emissiveIntensity={2} />
                </mesh>

                {/* Head */}
                <mesh position={[0, 2.9, 0]} castShadow receiveShadow>
                    <sphereGeometry args={[0.4, 32, 32]} />
                    <meshToonMaterial color={colors.primary} />
                    <Outlines thickness={0.02} color="black" />
                </mesh>
                {/* Visor */}
                <mesh position={[0, 2.95, 0.31]} rotation={[0, 0, Math.PI/2]}>
                    <capsuleGeometry args={[0.12, 0.5, 4, 16]} />
                    <meshToonMaterial color={colors.glow} emissive={colors.glow} emissiveIntensity={4} />
                    <Outlines thickness={0.02} color="black" />
                </mesh>
                <DreiSparkles count={20} scale={1} size={2} speed={0.5} color={colors.glow} opacity={0.8} />
                {/* Horns/Crest */}
                <mesh position={[-0.3, 3.2, 0]} rotation={[0, 0, 0.3]}>
                    <coneGeometry args={[0.1, 0.5, 16]} />
                    <meshToonMaterial color={colors.secondary} />
                    <Outlines thickness={0.02} color="black" />
                </mesh>
                <mesh position={[0.3, 3.2, 0]} rotation={[0, 0, -0.3]}>
                    <coneGeometry args={[0.1, 0.5, 16]} />
                    <meshToonMaterial color={colors.secondary} />
                    <Outlines thickness={0.02} color="black" />
                </mesh>

                {/* Shoulders */}
                <mesh position={[-0.7, 2.3, 0]} rotation={[0, 0, 0.2]}>
                    <sphereGeometry args={[0.35, 32, 32]} />
                    <meshToonMaterial color={colors.secondary} />
                    <Outlines thickness={0.02} color="black" />
                </mesh>
                <mesh position={[0.7, 2.3, 0]} rotation={[0, 0, -0.2]}>
                    <sphereGeometry args={[0.35, 32, 32]} />
                    <meshToonMaterial color={colors.secondary} />
                    <Outlines thickness={0.02} color="black" />
                </mesh>

                {/* Sword Arm */}
                <group position={[-0.8, 1.6, 0.2]} ref={swordRef}>
                    {/* Arm */}
                    <mesh position={[0, 0.4, 0]} rotation={[0.5, 0, 0]}>
                        <capsuleGeometry args={[0.12, 0.6, 4, 16]} />
                        <meshToonMaterial color={colors.secondary} />
                        <Outlines thickness={0.02} color="black" />
                    </mesh>
                    {/* Sword Handle */}
                    <mesh position={[0, -0.1, 0.3]} rotation={[1.5, 0, 0]}>
                        <cylinderGeometry args={[0.06, 0.06, 0.8, 16]} />
                        <meshToonMaterial color="#4b5563" />
                        <Outlines thickness={0.02} color="black" />
                    </mesh>
                    {/* Sword Guard */}
                    <mesh position={[0, -0.1, 0.7]} rotation={[1.5, 0, Math.PI/2]}>
                        <capsuleGeometry args={[0.1, 0.8, 4, 16]} />
                        <meshToonMaterial color={colors.primary} />
                        <Outlines thickness={0.02} color="black" />
                    </mesh>
                    {/* Sword Blade */}
                    <mesh position={[0, -0.1, 2.2]} rotation={[1.5, 0, 0]}>
                        <boxGeometry args={[0.2, 3.0, 0.05]} />
                        <meshToonMaterial color={colors.glow} emissive={colors.glow} emissiveIntensity={0.5} />
                        <Outlines thickness={0.02} color="black" />
                    </mesh>
                </group>

                {/* Shield Arm */}
                <group position={[0.8, 1.6, 0.2]}>
                    <mesh position={[0, 0.4, 0]} rotation={[0.5, 0, 0]}>
                        <capsuleGeometry args={[0.12, 0.6, 4, 16]} />
                        <meshToonMaterial color={colors.secondary} />
                        <Outlines thickness={0.02} color="black" />
                    </mesh>
                    <mesh position={[0.2, 0, 0.4]} rotation={[0, 1.5, 0]}>
                        <cylinderGeometry args={[0.7, 0.7, 0.1, 32]} />
                        <meshToonMaterial color={colors.primary} />
                        <Outlines thickness={0.02} color="black" />
                    </mesh>
                    <mesh position={[0.26, 0, 0.4]} rotation={[0, 1.5, 0]}>
                        <cylinderGeometry args={[0.5, 0.5, 0.12, 32]} />
                        <meshToonMaterial color={colors.cape} />
                        <Outlines thickness={0.02} color="black" />
                    </mesh>
                </group>
            </group>
        </Float>
    );
}

function MonsterModel({ isBoss, kills }: { isBoss: boolean, kills: number }) {
    const group = useRef<THREE.Group>(null);
    const ringRef = useRef<THREE.Group>(null);
    
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (group.current) {
            group.current.position.y = Math.sin(t * (isBoss ? 2 : 3)) * 0.2;
        }
        if (ringRef.current) {
            ringRef.current.rotation.x = t * 0.5;
            ringRef.current.rotation.y = t * 0.8;
        }
    });

    const mainColor = isBoss ? "#b91c1c" : "#7e22ce";
    const armorColor = isBoss ? "#1a0505" : "#1a1025";
    const scale = isBoss ? 1.5 : 1;

    return (
        <Float speed={3} rotationIntensity={0.5} floatIntensity={1}>
            <group ref={group} scale={scale}>
                {/* Core */}
                <mesh>
                    <octahedronGeometry args={[1, 0]} />
                    <meshToonMaterial color={mainColor} emissive={mainColor} emissiveIntensity={2} wireframe={!isBoss} />
                    <Outlines thickness={0.03} color="black" />
                </mesh>
                {/* Kawaii details */}
                <mesh position={[0, 1.2, 0]}>
                    <sphereGeometry args={[0.3, 16, 16]} />
                    <meshToonMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
                    <Outlines thickness={0.02} color="black" />
                </mesh>
                
                {/* Armor Shells */}
                <mesh position={[0, 0.5, 0]} rotation={[0, 0.78, 0]}>
                    <coneGeometry args={[1.2, 1, 4]} />
                    <meshToonMaterial color={armorColor} />
                    <Outlines thickness={0.02} color="black" />
                </mesh>
                <mesh position={[0, -0.5, 0]} rotation={[3.14, 0.78, 0]}>
                    <coneGeometry args={[1.2, 1, 4]} />
                    <meshToonMaterial color={armorColor} />
                    <Outlines thickness={0.02} color="black" />
                </mesh>

                {/* Orbiting Ring */}
                <group ref={ringRef}>
                    {[...Array(isBoss ? 8 : 4)].map((_, i) => {
                        const angle = (i / (isBoss ? 8 : 4)) * Math.PI * 2;
                        return (
                            <mesh key={i} position={[Math.cos(angle) * 2, 0, Math.sin(angle) * 2]} rotation={[0, -angle, 0]}>
                                <boxGeometry args={[0.2, 0.8, 0.2]} />
                                <meshToonMaterial color={armorColor} />
                                <Outlines thickness={0.02} color="black" />
                                <mesh position={[0, 0, 0.1]}>
                                    <boxGeometry args={[0.1, 0.4, 0.15]} />
                                    <meshToonMaterial color={mainColor} emissive={mainColor} emissiveIntensity={1} />
                                    <Outlines thickness={0.01} color="black" />
                                </mesh>
                            </mesh>
                        );
                    })}
                </group>

                {/* Boss specific details */}
                {isBoss && (
                    <>
                        {/* Crown */}
                        <mesh position={[0, 1.5, 0]}>
                            <torusGeometry args={[0.6, 0.1, 16, 5]} />
                            <meshToonMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1} />
                            <Outlines thickness={0.02} color="black" />
                        </mesh>
                        {/* Floating Hands */}
                        <mesh position={[-2, -1, 1]} rotation={[0, 0.5, 0.5]}>
                            <boxGeometry args={[0.6, 1.2, 0.4]} />
                            <meshToonMaterial color={armorColor} />
                            <Outlines thickness={0.02} color="black" />
                        </mesh>
                        <mesh position={[2, -1, 1]} rotation={[0, -0.5, -0.5]}>
                            <boxGeometry args={[0.6, 1.2, 0.4]} />
                            <meshToonMaterial color={armorColor} />
                            <Outlines thickness={0.02} color="black" />
                        </mesh>
                    </>
                )}
            </group>
        </Float>
    );
}

function SwordModel() {
    return (
        <group>
            <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.05, 0.05, 0.4]}/><meshToonMaterial color="#4b5563"/><Outlines thickness={0.02} color="black"/></mesh>
            <mesh position={[0, 0, 0]}><boxGeometry args={[0.4, 0.1, 0.1]}/><meshToonMaterial color="#111827" /><Outlines thickness={0.02} color="black"/></mesh>
            <mesh position={[0, 0.6, 0]}><boxGeometry args={[0.1, 1.2, 0.05]}/><meshToonMaterial color="#e5e7eb" /><Outlines thickness={0.02} color="black"/></mesh>
        </group>
    );
}

function BowModel() {
    return (
        <group>
            <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
                <torusGeometry args={[0.6, 0.05, 8, 16, Math.PI]} />
                <meshToonMaterial color="#78350f" />
                <Outlines thickness={0.02} color="black"/>
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                <cylinderGeometry args={[0.01, 0.01, 1.2]} />
                <meshToonMaterial color="#e5e7eb" />
                <Outlines thickness={0.02} color="black"/>
            </mesh>
        </group>
    );
}

function StaffModel() {
    return (
        <group>
            <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 1.5]}/><meshToonMaterial color="#451a03"/><Outlines thickness={0.02} color="black"/></mesh>
            <mesh position={[0, 0.8, 0]}><sphereGeometry args={[0.15, 16, 16]}/><meshToonMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2}/><Outlines thickness={0.02} color="black"/></mesh>
        </group>
    );
}

function KatanaModel() {
    return (
        <group>
            <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.04, 0.04, 0.5]}/><meshToonMaterial color="#172554"/><Outlines thickness={0.02} color="black"/></mesh>
            <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.05]}/><meshToonMaterial color="#fbbf24" /><Outlines thickness={0.02} color="black"/></mesh>
            <mesh position={[0, 0.7, 0]} rotation={[0, 0, -0.05]}><boxGeometry args={[0.06, 1.4, 0.02]}/><meshToonMaterial color="#e5e7eb" /><Outlines thickness={0.02} color="black"/></mesh>
        </group>
    );
}

function HammerModel() {
    return (
        <group>
            <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 1.2]}/><meshToonMaterial color="#78350f"/><Outlines thickness={0.02} color="black"/></mesh>
            <mesh position={[0, 0.6, 0]} rotation={[0, 0, Math.PI/2]}><cylinderGeometry args={[0.2, 0.2, 0.6]}/><meshToonMaterial color="#9ca3af" /><Outlines thickness={0.02} color="black"/></mesh>
        </group>
    );
}

function DaggerModel() {
    return (
        <group>
            <mesh position={[0, -0.1, 0]}><cylinderGeometry args={[0.03, 0.03, 0.2]}/><meshToonMaterial color="#1f2937"/><Outlines thickness={0.02} color="black"/></mesh>
            <mesh position={[0, 0, 0]}><boxGeometry args={[0.2, 0.05, 0.05]}/><meshToonMaterial color="#111827" /><Outlines thickness={0.02} color="black"/></mesh>
            <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.06, 0.6, 0.02]}/><meshToonMaterial color="#9ca3af" /><Outlines thickness={0.02} color="black"/></mesh>
        </group>
    );
}

function OrbModel() {
    return (
        <group>
            <mesh position={[0, 0, 0]}><sphereGeometry args={[0.2, 16, 16]}/><meshToonMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2}/><Outlines thickness={0.02} color="black"/></mesh>
            <mesh position={[0, 0, 0]} rotation={[Math.PI/4, 0, 0]}><torusGeometry args={[0.3, 0.02, 8, 16]}/><meshToonMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1}/><Outlines thickness={0.02} color="black"/></mesh>
            <mesh position={[0, 0, 0]} rotation={[0, Math.PI/4, 0]}><torusGeometry args={[0.3, 0.02, 8, 16]}/><meshToonMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1}/><Outlines thickness={0.02} color="black"/></mesh>
        </group>
    );
}

function Humanoid({ primary, secondary, weaponType }: { primary: string, secondary: string, weaponType: number }) {
    return (
        <group position={[0, -0.8, 0]}>
            {/* Legs */}
            <mesh position={[-0.2, 0.4, 0]}><capsuleGeometry args={[0.12, 0.6, 4, 16]}/><meshToonMaterial color={secondary}/><Outlines thickness={0.02} color="black"/></mesh>
            <mesh position={[0.2, 0.4, 0]}><capsuleGeometry args={[0.12, 0.6, 4, 16]}/><meshToonMaterial color={secondary}/><Outlines thickness={0.02} color="black"/></mesh>
            
            {/* Torso */}
            <mesh position={[0, 1.2, 0]}><capsuleGeometry args={[0.3, 0.6, 4, 16]}/><meshToonMaterial color={primary}/><Outlines thickness={0.02} color="black"/></mesh>
            
            {/* Head */}
            <mesh position={[0, 1.9, 0]}><sphereGeometry args={[0.3, 32, 32]}/><meshToonMaterial color={secondary}/><Outlines thickness={0.02} color="black"/></mesh>
            {/* Visor/Eyes */}
            <mesh position={[0, 1.95, 0.26]} rotation={[0, 0, Math.PI/2]}><capsuleGeometry args={[0.05, 0.2, 4, 16]} /><meshToonMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1}/><Outlines thickness={0.01} color="black"/></mesh>

            {/* Arms */}
            <group position={[-0.45, 1.4, 0]} rotation={[0, 0, 0.2]}>
                <mesh position={[0, -0.3, 0]}><capsuleGeometry args={[0.08, 0.5, 4, 16]}/><meshToonMaterial color={secondary}/><Outlines thickness={0.02} color="black"/></mesh>
            </group>
            
            <group position={[0.45, 1.4, 0]} rotation={[0, 0, -0.2]}>
                <mesh position={[0, -0.3, 0]}><capsuleGeometry args={[0.08, 0.5, 4, 16]}/><meshToonMaterial color={secondary}/><Outlines thickness={0.02} color="black"/></mesh>
                
                {/* Weapon Attachment */}
                <group position={[0, -0.6, 0.2]} rotation={[Math.PI/2, 0, 0]}>
                    {weaponType === 0 && <SwordModel />}
                    {weaponType === 1 && <BowModel />}
                    {weaponType === 2 && <StaffModel />}
                    {weaponType === 3 && <KatanaModel />}
                    {weaponType === 4 && <HammerModel />}
                    {weaponType === 5 && <DaggerModel />}
                    {weaponType === 6 && <OrbModel />}
                </group>
            </group>
            
            {/* Left hand weapon for Assassin */}
            {weaponType === 5 && (
                <group position={[-0.45, 1.4, 0]} rotation={[0, 0, 0.2]}>
                    <group position={[0, -0.6, 0.2]} rotation={[Math.PI/2, 0, 0]}>
                        <DaggerModel />
                    </group>
                </group>
            )}
        </group>
    );
}

function DragonModel({ primary, secondary }: { primary: string, secondary: string }) {
    return (
        <group position={[0, -0.5, 0]}>
            {/* Body */}
            <mesh position={[0, 0.8, 0]} rotation={[0.5, 0, 0]}><cylinderGeometry args={[0.4, 0.6, 1.5]}/><meshToonMaterial color={primary}/><Outlines thickness={0.03} color="black"/></mesh>
            {/* Head */}
            <mesh position={[0, 1.8, 0.6]}><boxGeometry args={[0.5, 0.5, 0.8]}/><meshToonMaterial color={primary}/><Outlines thickness={0.02} color="black"/></mesh>
            {/* Eyes */}
            <mesh position={[-0.25, 1.9, 0.8]}><sphereGeometry args={[0.08]}/><meshToonMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2}/></mesh>
            <mesh position={[0.25, 1.9, 0.8]}><sphereGeometry args={[0.08]}/><meshToonMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2}/></mesh>
            {/* Wings */}
            <mesh position={[-0.6, 1.2, -0.2]} rotation={[0, -0.5, 0.5]}><boxGeometry args={[1.5, 0.1, 0.8]}/><meshToonMaterial color={secondary}/><Outlines thickness={0.02} color="black"/></mesh>
            <mesh position={[0.6, 1.2, -0.2]} rotation={[0, 0.5, -0.5]}><boxGeometry args={[1.5, 0.1, 0.8]}/><meshToonMaterial color={secondary}/><Outlines thickness={0.02} color="black"/></mesh>
            {/* Tail */}
            <mesh position={[0, 0.2, -0.8]} rotation={[-0.5, 0, 0]}><coneGeometry args={[0.3, 1.5, 4]}/><meshToonMaterial color={primary}/><Outlines thickness={0.02} color="black"/></mesh>
        </group>
    );
}

function MiniModel({ index }: { index: number }) {
    const colors = [
        { primary: '#94a3b8', secondary: '#475569' }, // Squire (Silver/Gray)
        { primary: '#4ade80', secondary: '#166534' }, // Archer (Green)
        { primary: '#60a5fa', secondary: '#1e3a8a' }, // Mage (Blue)
        { primary: '#f87171', secondary: '#7f1d1d' }, // Samurai (Red)
        { primary: '#facc15', secondary: '#854d0e' }, // Paladin (Gold)
        { primary: '#111827', secondary: '#000000' }, // Assassin (Black)
        { primary: '#c084fc', secondary: '#581c87' }, // Summoner (Purple)
        { primary: '#dc2626', secondary: '#450a0a' }  // Dragon (Dark Red)
    ];
    const c = colors[index % colors.length];

    return (
        <Float speed={3} rotationIntensity={0.5} floatIntensity={0.5}>
            <group scale={0.55} position={[0, -0.4, 0]}>
                {index === 7 ? (
                    <DragonModel primary={c.primary} secondary={c.secondary} />
                ) : (
                    <Humanoid primary={c.primary} secondary={c.secondary} weaponType={index} />
                )}
            </group>
        </Float>
    );
}

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
    return (
        <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: [0, -3, 0], opacity: 1 }}
            transition={{ y: { duration: 2 + index * 0.2, repeat: Infinity, ease: "easeInOut" } }}
            className="relative flex flex-col items-center group"
        >
            <div className="w-20 h-24 relative overflow-visible transition-transform group-hover:scale-110">
                <Canvas camera={{ position: [0, 0.5, 3.5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[2, 5, 2]} intensity={1} />
                    <MiniModel index={index} />
                    <DreiSparkles count={15} scale={2} size={1} speed={0.2} color="#ffffff" opacity={0.5} />
                </Canvas>
                <div className="absolute -bottom-2 left-0 w-full text-center text-[11px] font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">LV.{level}</div>
            </div>
            <div className="mt-4 text-[10px] font-extrabold text-zinc-300 uppercase tracking-wider drop-shadow-md whitespace-nowrap">{name}</div>
        </motion.div>
    );
}

function HeroPortrait({ level, heroId }: { level: number; heroId: number }) {
    return (
        <div className="relative w-full max-w-[130px] lg:max-w-none lg:w-52 h-[180px] lg:h-[340px] group origin-bottom mx-auto">
            <Canvas shadows camera={{ position: [0, 1.5, 5.5], fov: 50 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, alpha: true }}>
                <ambientLight intensity={0.2} />
                <directionalLight position={[5, 5, 5]} intensity={1.5} color="#ef4444" castShadow shadow-mapSize={[1024, 1024]} />
                <directionalLight position={[-5, 5, -5]} intensity={0.8} color="#3b82f6" />
                <HeroModel id={heroId} />
                <DreiSparkles count={50} scale={4} size={2} speed={0.4} color="#ef4444" opacity={0.8} />
                <Environment preset="night" />
            </Canvas>
            
            <div className="absolute bottom-2 left-0 w-full flex flex-col items-center z-30 pointer-events-none">
                <div className="text-red-500 font-black text-[10px] tracking-[0.4em] uppercase mb-0 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">Awakened</div>
                <div className="text-3xl font-black text-white drop-shadow-lg">LV. {level}</div>
            </div>
        </div>
    );
}

function MonsterPortrait({ isBoss, kills, name }: { isBoss: boolean, kills: number, name: string }) {
    return (
        <div className={`relative w-full max-w-[150px] lg:max-w-none lg:w-64 h-[180px] lg:h-[340px] transition-all duration-300 origin-bottom mx-auto`}>
            {isBoss && (
                <div className="absolute inset-0 bg-red-500/20 blur-[50px] rounded-full pointer-events-none animate-pulse"></div>
            )}
            <Canvas shadows camera={{ position: [0, 0, 7], fov: 50 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, alpha: true }}>
                <ambientLight intensity={0.2} />
                <pointLight position={[0, 0, 0]} intensity={3} color={isBoss ? "#ef4444" : "#a855f7"} />
                <directionalLight position={[5, 5, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
                <MonsterModel isBoss={isBoss} kills={kills} />
                <DreiSparkles count={isBoss ? 100 : 50} scale={5} size={isBoss ? 4 : 2} speed={0.6} color={isBoss ? "#f59e0b" : "#ef4444"} opacity={0.8} />
                <Environment preset="night" />
            </Canvas>
        </div>
    );
}

const GACHA_PRIZES = [
    { type: 'souls', amount: 1000, text: "1000 Душ", color: "#eab308" },
    { type: 'crystals', amount: 200, text: "200 Кристаллов", color: "#a855f7" },
    { type: 'gold', amount: 15000, text: "15000 Золота", color: "#3b82f6" },
    { type: 'gold', amount: 2000, text: "2000 Золота", color: "#9ca3af" },
    { type: 'souls', amount: 500, text: "500 Душ", color: "#f59e0b" },
    { type: 'crystals', amount: 50, text: "50 Кристаллов", color: "#ec4899" },
];

export default function App() {
    const [gameState, setGameState] = useState<GameState>(() => {
        try {
            const saved = localStorage.getItem('animeSoul_save');
            if (saved) {
                let rawData = saved;
                // Check if it's obfuscated (Base64) or plain JSON
                if (!saved.startsWith('{')) {
                    try {
                        rawData = decodeURIComponent(atob(saved));
                    } catch(e) { 
                        rawData = saved;
                    }
                }
                
                const parsed = JSON.parse(rawData); 
                
                // Anti-Cheat: Validate values
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
        } catch (e) {
            console.error("Load error", e);
        }
        return spawnMonster(INITIAL_STATE);
    });
    
    const [activeTab, setActiveTab] = useState('team');
    const [damagePopups, setDamagePopups] = useState<{id: number, val: number, x: number, y: number}[]>([]);
    const [lastActiveDps, setLastActiveDps] = useState(0);
    const [gachaModal, setGachaModal] = useState<{show: boolean, spinning: boolean, prize: any, rotation: number}>({show: false, spinning: false, prize: null, rotation: 0});
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [playerName, setPlayerName] = useState('Аноним');
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    const popupIdRef = useRef(0);
    const activeDpsBufRef = useRef(0);
    const gameStateRef = useRef(gameState);
    const lastSyncTimeRef = useRef(0);

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

                // Load from CloudStorage if supported (v6.9+)
                if (tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9')) {
                    try {
                        tg.CloudStorage.getItem('animeSoul_save', (err: any, value: string) => {
                            if (!err && value) {
                                try {
                                    const rawData = decodeURIComponent(atob(value));
                                    const parsed = JSON.parse(rawData);
                                    setGameState(prev => ({ ...prev, ...parsed }));
                                } catch (e) { console.error("Cloud load fail", e); }
                            }
                        });
                    } catch(e) {}
                }
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

        // --- Firebase Auth & Leaderboard ---
        signInAnonymously(auth).catch(err => {
            if (err.code === 'auth/admin-restricted-operation') {
                console.warn("Leaderboard: Anonymous auth is not enabled in Firebase Console. Please enable it in 'Authentication -> Sign-in method'.");
            } else {
                console.error("Auth fail", err);
            }
        });

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsAuthReady(true);
            }
        });

        const q = query(collection(db, 'leaderboard'), orderBy('stage', 'desc'), limit(10));
        const unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => doc.data());
            setLeaderboard(data);
            
            if (auth.currentUser) {
                const myRank = snapshot.docs.findIndex(doc => doc.id === auth.currentUser?.uid);
                if (myRank !== -1) setUserRank(myRank + 1);
            }
        }, (err) => handleFirestoreError(err, 'LIST', 'leaderboard'));

        return () => {
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
            unsubscribeAuth();
            unsubscribeLeaderboard();
        };
    }, []);

    // Push score to Firestore
    useEffect(() => {
        if (!isAuthReady || !auth.currentUser) return;

        const stage = Math.floor(gameState.totalKills / 5) + 1;
        const now = Date.now();

        // Sync every 30 seconds or if stage increases
        if (now - lastSyncTimeRef.current > 30000 || stage > (INITIAL_STATE.totalKills / 5) + 1) {
            const uid = auth.currentUser.uid;
            const entry = {
                uid,
                username: playerName,
                stage,
                subStage: gameState.subStage,
                dps: getStaticDps(gameState),
                glory: gameState.glory,
                lastUpdated: serverTimestamp()
            };

            setDoc(doc(db, 'leaderboard', uid), entry, { merge: true })
                .catch(err => handleFirestoreError(err, 'WRITE', 'leaderboard/' + uid));
            lastSyncTimeRef.current = now;
        }
    }, [gameState.totalKills, isAuthReady, playerName]);

    const saveState = (state: GameState) => {
        try {
            const json = JSON.stringify(state);
            // Simple obfuscation to prevent casual localstorage editing
            const obfuscated = btoa(encodeURIComponent(json));
            localStorage.setItem('animeSoul_save', obfuscated);
            
            // Sync to Telegram CloudStorage if supported (v6.9+)
            const tg = (window as any).Telegram?.WebApp;
            if (tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9')) {
                try {
                    tg.CloudStorage.setItem('animeSoul_save', obfuscated);
                } catch (e) {
                    console.error("Cloud save failed (suppressed error)", e);
                }
            }
        } catch (e) {
            console.error("Save error");
        }
    };

    useEffect(() => {
        gameStateRef.current = gameState;
        saveState(gameState);
    }, [gameState]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setGameState(prev => {
                let next = { ...prev };
                let dps = getStaticDps(next);
                if (dps > 0) {
                    next = applyDamage(next, dps / 10, false);
                }
                if (next.buffs.frenzyUntil > now || next.buffs.autoClickerUntil > now) {
                    const dmg = getClickDmg(next);
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
                        y: rect.top + rect.height / 2 + scatterY 
                    }]);
                    setTimeout(() => {
                        setDamagePopups(pop => pop.filter(p => p.id !== id));
                    }, 700);
                }
            }
        }, 1000);
        return () => clearInterval(dpsInterval);
    }, []);

    const handleHit = (e?: React.MouseEvent) => {
        const dmg = getClickDmg(gameState);
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
                y: rect.top + rect.height / 2 + scatterY 
            }]);
            setTimeout(() => {
                setDamagePopups(prev => prev.filter(p => p.id !== id));
            }, 700);
        }
        
        setGameState(prev => applyDamage(prev, dmg, true));
    };

    const buyMerc = (id: number) => {
        setGameState(prev => {
            const m = prev.mercs[id];
            if (m.level >= m.maxLevel) return prev;
            
            const cost = Math.floor(m.cost * Math.pow(1.5, m.level));
            if (prev.gold >= cost) {
                const newMercs = [...prev.mercs];
                newMercs[id] = { ...m, level: m.level + 1 };
                return { ...prev, gold: prev.gold - cost, mercs: newMercs };
            }
            return prev;
        });
    };

    const upLvl = () => {
        setGameState(prev => {
            if (prev.player.lvl >= 100) return prev;
            const cost = Math.floor(100 * Math.pow(1.2, prev.player.lvl));
            if (prev.gold >= cost) {
                return { ...prev, gold: prev.gold - cost, player: { ...prev.player, lvl: prev.player.lvl + 1 } };
            }
            return prev;
        });
    };

    const upGear = (g: 'sword' | 'armor' | 'ring') => {
        setGameState(prev => {
            if (prev.player.gear[g] >= 100) return prev;
            const baseCost = g === 'sword' ? 150 : g === 'armor' ? 600 : 1500;
            const multiplier = g === 'sword' ? 1.8 : g === 'armor' ? 1.9 : 2.0;
            const cost = Math.floor(baseCost * Math.pow(multiplier, prev.player.gear[g]));
            if (prev.gold >= cost) {
                return { 
                    ...prev, 
                    gold: prev.gold - cost, 
                    player: { ...prev.player, gear: { ...prev.player.gear, [g]: prev.player.gear[g] + 1 } } 
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
                    next = applyDamage(next, getClickDmg(next) * 50, false);
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

    const rollGacha = () => {
        if (gameState.crystals < 50 || gachaModal.show) return;
        
        const prizeIndex = Math.floor(Math.random() * GACHA_PRIZES.length);
        const extraSpins = 5;
        const segmentAngle = 360 / GACHA_PRIZES.length;
        const targetRotation = extraSpins * 360 + (360 - (prizeIndex * segmentAngle + segmentAngle / 2));

        setGameState(prev => ({ ...prev, crystals: prev.crystals - 50 }));
        setGachaModal({ show: true, spinning: true, prize: null, rotation: targetRotation });
        
        setTimeout(() => {
            setGachaModal(prev => ({ ...prev, spinning: false, prize: GACHA_PRIZES[prizeIndex] }));
        }, 3000);
    };

    const acceptGacha = () => {
        setGameState(prev => {
            let next = { ...prev };
            if (gachaModal.prize.type === 'souls') next.souls += gachaModal.prize.amount;
            if (gachaModal.prize.type === 'crystals') next.crystals += gachaModal.prize.amount;
            if (gachaModal.prize.type === 'gold') next.gold += gachaModal.prize.amount;
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
        switch (activeTab) {
            case 'team':
                return (
                    <div className="flex flex-col gap-3">
                        {gameState.mercs.map((m, i) => {
                            const cost = Math.floor(m.cost * Math.pow(1.5, m.level));
                            const canBuy = gameState.gold >= cost;
                            return (
                                <div key={m.id} className="aaa-glass p-3 rounded-3xl flex flex-col gap-2 relative overflow-hidden group">
                                    <div className="absolute -left-4 -top-4 w-16 h-16 bg-gradient-to-br from-pink-300/20 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
                                    <div className="flex justify-between items-start z-10">
                                        <div className="flex gap-3 items-center">
                                            <div className="w-14 h-14 bg-zinc-900/50 border border-red-900/50 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                                                {m.level > 0 ? (
                                                    <Canvas camera={{ position: [0, 0.5, 3.5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
                                                        <ambientLight intensity={0.5} />
                                                        <directionalLight position={[2, 5, 2]} intensity={1} />
                                                        <MiniModel index={i} />
                                                    </Canvas>
                                                ) : (
                                                    <div className="text-2xl opacity-50">👤</div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-extrabold text-sm text-slate-700 uppercase tracking-wide">{m.name}</span>
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
                const hCost = gameState.player.lvl * 100;
                const sCost = Math.floor(100 * Math.pow(1.7, gameState.player.gear.sword));
                const aCost = Math.floor(500 * Math.pow(1.8, gameState.player.gear.armor));
                const rCost = Math.floor(1000 * Math.pow(1.9, gameState.player.gear.ring));
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
                            <div className="text-xs text-red-400 font-bold mb-2 uppercase z-10">Click DMG: {format(getClickDmg(gameState))}</div>
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
                                            <span>{ready ? s.cd : Math.max(0, Math.ceil(s.cd * (gameState.arts[4].owned ? 0.8 : 1) - (Date.now() - s.last) / 1000))}s</span>
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
                                disabled={gameState.crystals < 50 || gachaModal.show}
                                className={`aaa-btn w-full py-3 px-4 rounded-xl font-bold text-sm uppercase z-10 ${
                                    gameState.crystals >= 50 && !gachaModal.show
                                    ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-500/50' 
                                    : 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border-transparent'
                                }`}
                            >
                                <span className="flex justify-between items-center">
                                    <span>{gachaModal.spinning ? 'Rolling...' : 'Roll'}</span>
                                    <span className="flex items-center gap-1"><Gem size={16}/> 50</span>
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
                        <div className="aaa-glass p-4 rounded-3xl flex flex-col gap-4 relative overflow-hidden">
                            <div className="font-extrabold text-lg text-red-500 uppercase tracking-wide z-10 text-center flex items-center justify-center gap-2">
                                <Trophy size={20} />
                                Топ Игроков
                            </div>
                            
                            <div className="flex flex-col gap-2 z-10">
                                {leaderboard.length === 0 ? (
                                    <div className="text-center py-8 text-zinc-500 font-bold animate-pulse italic">Загрузка рейтинга...</div>
                                ) : (
                                    leaderboard.map((p, i) => (
                                        <div key={i} className={`flex justify-between items-center p-2 rounded-xl border ${p.uid === auth.currentUser?.uid ? 'bg-red-900/40 border-red-500' : 'bg-zinc-900/50 border-red-900/30'}`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`${i < 3 ? 'text-yellow-500' : 'text-zinc-500'} font-black w-5`}>#{i + 1}</span>
                                                <span className="text-zinc-200 font-bold truncate max-w-[120px]">{p.username}</span>
                                            </div>
                                            <div className="flex flex-col items-end text-xs shrink-0">
                                                <span className="text-red-400 font-black">Stage {p.stage}</span>
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
                                            <span className="text-zinc-500 text-[10px]">{format(getStaticDps(gameState))} DPS</span>
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

            <main className="flex-1 flex flex-col relative z-10 p-2 lg:px-4 lg:pb-4 overflow-y-auto lg:overflow-hidden overflow-x-hidden">
                <div className="aaa-glass lg:mt-4 mt-1 flex flex-wrap lg:flex-nowrap items-center justify-between p-2 lg:px-8 z-10 border-red-500/60 shadow-[0_4px_20px_rgba(239,68,68,0.2)] gap-2 lg:gap-0">
                    <div className="flex items-center justify-center lg:justify-start gap-4 lg:gap-10 w-full lg:w-auto order-2 lg:order-1">
                        <div className="flex flex-col text-center lg:text-left">
                            <span className="text-[8px] lg:text-[10px] text-red-500 font-black anime-header">Total DPS</span>
                            <div className="text-xl lg:text-3xl font-display text-white tracking-widest">{format(getStaticDps(gameState))}</div>
                        </div>
                        <div className="flex flex-col text-center lg:text-left">
                            <span className="text-[8px] lg:text-[10px] text-yellow-500 font-black anime-header">Gold</span>
                            <div className="text-xl lg:text-3xl font-display text-yellow-500 flex items-center gap-1 justify-center lg:justify-start">{format(gameState.gold)} <Coins size={16} className="hidden lg:block"/></div>
                        </div>
                    </div>
                    
                    <div className="text-center w-full lg:w-auto order-1 lg:order-2 lg:absolute lg:left-1/2 lg:-translate-x-1/2 flex flex-col items-center justify-center">
                        <div className="text-[8px] lg:text-[10px] text-red-500 font-black anime-header hidden lg:block">Current Objective</div>
                        <div className="bg-red-600 px-4 lg:px-6 py-1 text-white font-display text-xl lg:text-2xl skew-x-[-15deg] shadow-[4px_4px_0px_#7f1d1d]">
                            STAGE {Math.floor(gameState.totalKills/5)+1}-{gameState.subStage}
                        </div>
                    </div>

                    <div className="flex items-center justify-center lg:justify-end gap-4 lg:gap-6 w-full lg:w-auto order-3 mt-1 lg:mt-0">
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

                        {window.Telegram?.WebApp && (
                            <button 
                                onClick={() => {
                                    try {
                                        const text = `Я на STAGE ${Math.floor(gameState.totalKills/5)+1}-${gameState.subStage} в AnimeSoul! Мой урон: ${format(getStaticDps(gameState))}`;
                                        (window as any).Telegram?.WebApp?.sendData?.(text);
                                    } catch (e) {}
                                }}
                                className="flex flex-col items-center lg:items-end text-green-400 hover:text-green-300 transition-colors"
                            >
                                <span className="text-[8px] lg:text-[10px] font-black anime-header">Share</span>
                                <div className="text-lg lg:text-2xl font-display flex items-center gap-1 lg:gap-2">
                                    <Share size={14} className="lg:w-4 lg:h-4"/>
                                </div>
                            </button>
                        )}
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
                        <div className="w-full max-w-[600px] h-6 lg:h-10 aaa-glass aaa-hp-bar overflow-hidden relative border-red-600/50 mb-2 lg:mb-4 transition-all duration-300">
                            <motion.div 
                                className="h-full bg-gradient-to-r from-red-600 via-red-500 to-red-400"
                                initial={false}
                                animate={{ width: `${Math.max(0, (gameState.enemy.hp / gameState.enemy.max) * 100)}%` }}
                                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-sm lg:text-xl font-display text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] italic">
                                {format(gameState.enemy.hp)} / {format(gameState.enemy.max)}
                            </div>
                        </div>

                        <h3 className="text-xl lg:text-3xl font-display text-white mb-1 lg:mb-2 italic tracking-widest bg-black/60 px-4 lg:px-6 py-1 lg:py-2 border-l-2 lg:border-l-4 border-red-600 shadow-xl text-center">
                            {gameState.enemy.name}
                        </h3>
                        
                        {gameState.isBoss && (
                            <div className="text-lg lg:text-2xl font-display text-red-500 animate-pulse mt-1 lg:mt-2 flex items-center gap-2 lg:gap-3">
                                <span className="bg-red-600 text-white px-2 lg:px-3 text-sm lg:text-lg not-italic">BOSS</span>
                                {gameState.bossTime}s
                            </div>
                        )}
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
                            <TeamAvatar index={i} level={m.level} name={m.name} />
                        </div>
                    ))}
                </div>

                <AnimatePresence>
                    {damagePopups.map(popup => (
                        <motion.div
                            key={popup.id}
                            initial={{ opacity: 1, y: popup.y, x: popup.x, scale: 0.5 }}
                            animate={{ opacity: 0, y: popup.y - 120, scale: 1.5 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="fixed pointer-events-none text-4xl font-black text-red-500 z-50"
                            style={{ 
                                left: 0,
                                top: 0,
                                marginLeft: '-2rem',
                                WebkitTextStroke: '2px #450a0a',
                                textShadow: '0 4px 8px rgba(220,38,38,0.8)'
                            }}
                        >
                            {format(popup.val)}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Gacha Modal Overlay */}
                <AnimatePresence>
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
                                        className="flex flex-col items-center gap-4 z-10"
                                    >
                                        <div className={`text-xl font-black text-center text-white drop-shadow-md`}>
                                            {gachaModal.prize.text}
                                        </div>
                                        <button 
                                            onClick={acceptGacha}
                                            className="aaa-btn py-3 px-8 rounded-xl font-bold text-lg uppercase"
                                        >
                                            Забрать
                                        </button>
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
