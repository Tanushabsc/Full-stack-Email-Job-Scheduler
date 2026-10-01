import {redis} from '../config/redis';
const reserveScript=`
local countKey=KEYS[1]
local lastKey=KEYS[2]
local limit=tonumber(ARGV[1])
local minDelay=tonumber(ARGV[2])
local now=tonumber(ARGV[3])
local ttl=tonumber(ARGV[4])
local count=tonumber(redis.call('GET',countKey) or '0')
if count >= limit then return {0,ttl * 1000} end
local last=tonumber(redis.call('GET',lastKey) or '0')
if last > 0 and now-last < minDelay then return {-1,minDelay-(now-last)} end
redis.call('INCR',countKey); redis.call('EXPIRE',countKey,ttl)
redis.call('SET',lastKey,now); redis.call('PEXPIRE',lastKey,ttl)
return {1,0}`;
export async function reserveSend(senderId:string,limit:number,minDelay:number){const now=Date.now();const hour=Math.floor(now/3600000);const countKey=`rate:${senderId}:${hour}`;const lastKey=`lastsend:${senderId}`;const ttl=Math.max(3600,Math.ceil((3600000-(now%3600000))/1000)+10);const result=await redis.eval(reserveScript,2,countKey,lastKey,limit,minDelay,now,ttl) as number[]; return {ok:result[0]===1,reason:result[0]===0?'hour':result[0]===-1?'delay':'ok',waitMs:Number(result[1]||0)};}
