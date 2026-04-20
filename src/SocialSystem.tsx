import React, { useState, useEffect } from 'react';
import { 
    Users, Shield, Trophy, UserPlus, Mail, Gamepad2, 
    Check, X, Search, Settings, Star, Hash, 
    UsersRound, Swords, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    doc, getDoc, getDocs, collection, query, where, 
    setDoc, updateDoc, onSnapshot, serverTimestamp, 
    runTransaction, limit, orderBy, addDoc, deleteDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';

interface SocialProps {
    uid: string;
    username: string;
    playerData: any;
    onClose: () => void;
}

export const SocialSystem: React.FC<SocialProps> = ({ uid, username, playerData, onClose }) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'friends' | 'clans' | 'dungeons'>('profile');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [clan, setClan] = useState<any>(null);
    const [invites, setInvites] = useState<any[]>([]);
    const [activeDungeon, setActiveDungeon] = useState<any>(null);
    const [isUpdatingName, setIsUpdatingName] = useState(false);
    const [statusText, setStatusText] = useState(playerData.status || 'Легенда AnimeSoul');
    
    useEffect(() => {
        if (!uid) return;
        
        // Listen to Friends
        const unsubFriends = onSnapshot(collection(db, `users/${uid}/friends`), async (snap) => {
            const friendList = [];
            for (const d of snap.docs) {
                const friendDataSnap = await getDoc(doc(db, 'users', d.id));
                if (friendDataSnap.exists()) {
                    friendList.push({ id: d.id, ...friendDataSnap.data() });
                }
            }
            setFriends(friendList);
        });

        // Listen to Invites
        const qInvites = query(collection(db, 'invites'), where('toId', '==', uid), where('status', '==', 'pending'));
        const unsubInvites = onSnapshot(qInvites, (snap) => {
            setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubFriends();
            unsubInvites();
        };
    }, [uid]);

    const handleSearch = async () => {
        if (searchQuery.length < 3) return;
        const q = query(collection(db, 'users'), where('username', '>=', searchQuery), where('username', '<=', searchQuery + '\uf8ff'), limit(5));
        const snap = await getDocs(q);
        setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== uid));
    };

    const sendInvite = async (type: 'friend' | 'clan' | 'dungeon', toId: string) => {
        await addDoc(collection(db, 'invites'), {
            fromId: uid,
            fromName: username,
            toId,
            type,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        (window as any).Telegram?.WebApp?.showAlert?.("Приглашение отправлено!");
    };

    const acceptInvite = async (invite: any) => {
        await runTransaction(db, async (txn) => {
            if (invite.type === 'friend') {
                txn.set(doc(db, `users/${uid}/friends`, invite.fromId), { addedAt: serverTimestamp() });
                txn.set(doc(db, `users/${invite.fromId}/friends`, uid), { addedAt: serverTimestamp() });
            }
            txn.update(doc(db, 'invites', invite.id), { status: 'accepted' });
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-[#0a0a0b] border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-6 border-bottom border-zinc-900 bg-gradient-to-b from-zinc-900/50 to-transparent">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
                                <Users className="text-white" size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tighter">Social Hub</h2>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Connect & Conquer</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 bg-black/50 p-1 rounded-2xl border border-zinc-800">
                        {['profile', 'friends', 'clans', 'dungeons'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                    activeTab === tab 
                                    ? 'bg-red-600 text-white shadow-lg' 
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-purple-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                <div className="relative bg-[#0d0d0f] p-8 rounded-[2rem] border border-zinc-800 flex flex-col items-center gap-4">
                                    <div className="w-24 h-24 bg-zinc-900 rounded-full border-4 border-zinc-800 flex items-center justify-center overflow-hidden">
                                        <div className="text-4xl font-black text-zinc-800 uppercase tracking-tighter">
                                            {username[0]}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-2xl font-black text-white tracking-tighter mb-1">{username}</h3>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mb-4">{statusText}</p>
                                        <div className="flex gap-2">
                                            <div className="bg-black/50 px-4 py-2 rounded-xl border border-zinc-800">
                                                <span className="text-[9px] text-zinc-500 font-bold uppercase mr-2">Level</span>
                                                <span className="text-white font-black">{playerData.player.lvl}</span>
                                            </div>
                                            <div className="bg-black/50 px-4 py-2 rounded-xl border border-zinc-800">
                                                <span className="text-[9px] text-zinc-500 font-bold uppercase mr-2">Glory</span>
                                                <span className="text-white font-black">{playerData.glory}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Shield size={12} className="text-red-500" /> Current Clan
                                    </h4>
                                    <p className="text-sm font-bold text-white mb-2">No Clan Joined</p>
                                    <button className="text-[9px] text-blue-500 font-black uppercase hover:text-blue-400 transition-colors">Find or Create</button>
                                </div>
                                <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Trophy size={12} className="text-yellow-500" /> Global Rank
                                    </h4>
                                    <p className="text-sm font-bold text-white mb-2">#--</p>
                                    <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest">Recalculating...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'friends' && (
                        <div className="space-y-6">
                            {/* Search */}
                            <div className="flex gap-2">
                                <div className="flex-1 bg-black rounded-2xl border border-zinc-800 flex items-center px-4">
                                    <Search size={16} className="text-zinc-600" />
                                    <input 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="SEARCH USERS..."
                                        className="bg-transparent border-none focus:ring-0 text-white text-[10px] font-black w-full uppercase p-4"
                                    />
                                </div>
                                <button onClick={handleSearch} className="bg-red-600 p-4 rounded-2xl text-white hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all">
                                    <Check size={20} />
                                </button>
                            </div>

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="space-y-2 p-4 bg-zinc-900/30 rounded-[2rem] border border-zinc-800/50">
                                    <h4 className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mb-2 px-2">Discovery Protocol</h4>
                                    {searchResults.map(res => (
                                        <div key={res.id} className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-between group hover:border-red-500/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center font-black text-xs text-red-500">{res.username[0]}</div>
                                                <div>
                                                    <div className="text-[10px] font-black text-white uppercase">{res.username}</div>
                                                    <div className="text-[7px] text-zinc-500 font-bold uppercase">LVL {res.player?.lvl || 1}</div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => sendInvite('friend', res.id)}
                                                className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-inner"
                                            >
                                                <UserPlus size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Current Friends */}
                            <div className="space-y-2">
                                <h4 className="text-[8px] text-zinc-600 font-black uppercase tracking-widest pl-2">Online Allies ({friends.length})</h4>
                                {friends.length === 0 ? (
                                    <div className="text-center py-10 text-zinc-600 italic font-mono text-[9px] uppercase">No active beacons detected</div>
                                ) : friends.map(f => (
                                    <div key={f.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-between shadow-inner">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#070708] rounded-xl flex items-center justify-center font-black text-red-500 border border-zinc-800">{f.username[0]}</div>
                                            <div>
                                                <div className="text-[11px] font-black text-white uppercase tracking-tight">{f.username}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                                                    <span className="text-[7px] text-zinc-500 font-black uppercase">Active Stage {Math.floor(f.totalKills/5)+1}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="text-zinc-600 hover:text-red-500 transition-colors p-2"><Mail size={16}/></button>
                                    </div>
                                ))}
                            </div>

                            {/* Pending Invites */}
                            {invites.length > 0 && (
                                <div className="space-y-2 mt-8">
                                    <h4 className="text-[8px] text-red-500 font-black uppercase tracking-[0.3em] pl-2 flex items-center gap-2">
                                        <Star size={10} className="animate-spin-slow" /> Incoming Protocol Request
                                    </h4>
                                    {invites.map(inv => (
                                        <div key={inv.id} className="p-4 bg-red-600/5 border border-red-600/20 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <div className="text-[9px] font-black text-white uppercase">{inv.fromName}</div>
                                                <div className="text-[7px] text-red-400 font-bold uppercase">Wants to be {inv.type === 'friend' ? 'friends' : 'clan mates'}</div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => acceptInvite(inv)} className="p-2 bg-green-600 rounded-lg text-white shadow-lg shadow-green-600/20"><Check size={14}/></button>
                                                <button className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><X size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'dungeons' && (
                        <div className="space-y-6">
                            <div className="p-8 bg-gradient-to-br from-red-900/40 to-transparent border border-red-500/20 rounded-[2rem] text-center shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/dungeon/800/400')] opacity-5 mix-blend-overlay group-hover:scale-110 transition-transform duration-[10000ms]"></div>
                                <Swords className="mx-auto text-red-500 mb-4 animate-bounce" size={48} />
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Shadow Dungeons</h3>
                                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest max-w-[200px] mx-auto mb-6">Coordinate attacks in real-time with an ally to harvest rare artifacts.</p>
                                <button className="px-8 py-4 bg-red-600 text-white font-black text-[11px] uppercase rounded-2xl shadow-xl shadow-red-600/30 hover:scale-105 active:scale-95 transition-all tracking-widest border border-white/10">
                                    Initialize Co-op Session
                                </button>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-[8px] text-zinc-600 font-black uppercase tracking-widest pl-2">Active Allies for Invite</h4>
                                {friends.map(f => (
                                    <div key={f.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-between hover:bg-zinc-800/50 transition-all cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-black rounded-lg border border-red-500/30 flex items-center justify-center"><Hash className="text-red-500" size={14} /></div>
                                            <span className="text-[10px] font-black text-white uppercase">{f.username}</span>
                                        </div>
                                        <button 
                                            onClick={() => sendInvite('dungeon', f.id)}
                                            className="px-4 py-2 bg-zinc-800 text-red-500 text-[8px] font-black uppercase rounded-lg border border-red-500/20 hover:bg-red-600 hover:text-white transition-all shadow-inner"
                                        >
                                            Summon
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'clans' && (
                        <div className="space-y-6">
                             <div className="p-10 border-2 border-dashed border-zinc-800 rounded-[2.5rem] flex flex-col items-center gap-6 justify-center text-center group">
                                <div className="w-20 h-20 rounded-[2rem] bg-zinc-900 flex items-center justify-center text-zinc-800 group-hover:text-red-600 transition-colors duration-500">
                                    <UsersRound size={40} />
                                </div>
                                <div>
                                    <h3 className="text-white font-black uppercase tracking-tighter text-lg mb-1">Found Your Legacy</h3>
                                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Join a guild to unlock legacy bonuses and competitive rankings.</p>
                                </div>
                                <div className="flex gap-2 w-full max-w-[250px]">
                                    <button className="flex-1 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-[9px] font-black text-zinc-400 uppercase tracking-widest hover:border-zinc-700 transition-all">Search</button>
                                    <button className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 hover:scale-105 active:scale-95 transition-all">Create</button>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
                
                {/* Footer Status */}
                <div className="p-4 bg-black border-t border-zinc-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Neural Link Synchronized</span>
                    </div>
                    <div className="text-[8px] text-zinc-700 font-mono italic">UID: {uid.slice(0,8)}...</div>
                </div>
            </motion.div>
        </div>
    );
};
