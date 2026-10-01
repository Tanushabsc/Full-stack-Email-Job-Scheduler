import {Router} from 'express'; import {auth} from '../middleware/auth'; import {prisma} from '../config/db';
export const slackRouter=Router();slackRouter.use(auth);slackRouter.get('/status',async(req,res)=>{const user=(req as any).user;const c=await prisma.slackConnection.findUnique({where:{userId:user.id},select:{teamName:true,channelId:true}});res.json({connected:!!c,...c});});
slackRouter.delete('/disconnect',async(req,res)=>{await prisma.slackConnection.deleteMany({where:{userId:(req as any).user.id}});res.json({ok:true});});
