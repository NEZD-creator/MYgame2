import https from 'https';

const urls = [
    'UI_MonsterIcon_Slime_Fire',
    'UI_MonsterIcon_Slime_Water',
    'UI_MonsterIcon_Slime_Wind',
    'UI_MonsterIcon_Slime_Elec',
    'UI_MonsterIcon_RuinGuard',
    'UI_MonsterIcon_RuinHunter',
    'UI_MonsterIcon_Hili_Standard',
    'UI_MonsterIcon_Hili_Fire',
    'UI_MonsterIcon_Samachurl_Water',
    'UI_MonsterIcon_Abyss_Fire',
    'UI_MonsterIcon_Dragon_Dvalin',
    'UI_MonsterIcon_Wolf_Boreas',
    'UI_AvatarIcon_Klee',
    'UI_AvatarIcon_Qiqi'
];

urls.forEach(name => {
    https.get(`https://enka.network/ui/${name}.png`, (res) => {
        console.log(`${name}: ${res.statusCode}`);
    });
});
