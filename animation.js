/* IronFrame suit animation controller. All angles below are degrees. */
(function(){
'use strict';
const DEG=Math.PI/180;
const defaults={
 enabled:true, weaponClass:'rifle', attack:false, attackSpeed:1, swingAngle:50,
 swordReadyAngle:90, idle:true, idleSpeed:2, idleAmount:2,
 walk:false, walkSpeed:7, walkAngle:28, legAngle:22, torsoTurn:0,
 headTurn:0, headTilt:0, leftArmAngle:0, rightArmAngle:0,
 leftLegAngle:0, rightLegAngle:0, loopAttack:false
};
function group(THREE,name,pos){const g=new THREE.Group();g.name=name; if(pos)g.position.copy(pos);return g;}
function classify(o){ const p=o.position; const n=(o.name||'').toLowerCase();
 if(n.includes('head')||p.y>3.55)return'head';
 if(p.y<1.25)return p.x<0?'leftLeg':'rightLeg';
 if(p.x<-1.0)return'leftArm'; if(p.x>1.0)return'rightArm'; return'torso'; }
function makeParts(built,THREE){
 if(built.parts)return built;
 const root=built.root, parts={};
 ['head','torso','leftArm','rightArm','leftLeg','rightLeg'].forEach(k=>{parts[k]=group(THREE,k); root.add(parts[k]);});
 // Preserve world appearance while moving root children into articulated groups.
 const children=root.children.slice().filter(c=>!Object.values(parts).includes(c));
 children.forEach(c=>{const kind=classify(c); parts[kind].attach(c);});
 built.parts=parts;
 built.head=parts.head; built.torso=parts.torso; built.leftArm=parts.leftArm; built.rightArm=parts.rightArm; built.leftLeg=parts.leftLeg; built.rightLeg=parts.rightLeg;
 return built;
}
function controller(built,THREE,options={}){
 makeParts(built,THREE); const cfg=Object.assign({},defaults,options); let attackTime=0,lastAttack=false;
 const c={built,parts:built.parts,config:cfg,set(o){Object.assign(cfg,o);return c;},attack(){cfg.attack=true;attackTime=0;return c;},update(dt=1/60,time=performance.now()/1000){
   if(!cfg.enabled)return; const p=built.parts;
   // absolute user offsets
   p.head.rotation.y=cfg.headTurn*DEG; p.head.rotation.x=cfg.headTilt*DEG;
   p.torso.rotation.y=cfg.torsoTurn*DEG;
   p.leftArm.rotation.x=cfg.leftArmAngle*DEG; p.rightArm.rotation.x=cfg.rightArmAngle*DEG;
   p.leftLeg.rotation.x=cfg.leftLegAngle*DEG; p.rightLeg.rotation.x=cfg.rightLegAngle*DEG;
   // sword ready pose: right arm points up/forward by configurable angle
   if(cfg.weaponClass==='sword') p.rightArm.rotation.z=cfg.swordReadyAngle*DEG;
   else p.rightArm.rotation.z=0;
   // walking cycle
   if(cfg.walk){const s=Math.sin(time*cfg.walkSpeed); p.leftArm.rotation.x+=s*cfg.walkAngle*DEG; p.rightArm.rotation.x-=s*cfg.walkAngle*DEG; p.leftLeg.rotation.x-=s*cfg.legAngle*DEG; p.rightLeg.rotation.x+=s*cfg.legAngle*DEG;}
   else if(cfg.idle){p.torso.rotation.x=Math.sin(time*cfg.idleSpeed)*cfg.idleAmount*DEG;}
   // attack swing: +50 down to 0 at attackSpeed. Weapon should be parented to rightArm for sword weapons.
   if(cfg.attack){attackTime+=dt*cfg.attackSpeed; const phase=Math.min(attackTime,1); const swing=Math.sin(phase*Math.PI)*cfg.swingAngle; p.rightArm.rotation.x-=swing*DEG; if(phase>=1){attackTime=0;if(!cfg.loopAttack)cfg.attack=false;}}
   lastAttack=cfg.attack;
 },reset(){Object.assign(cfg,defaults);Object.values(built.parts).forEach(x=>x.rotation.set(0,0,0));return c;}};
 return c;
}
window.SuitAnimation={defaults,makeParts,create:controller,DEG};
})();
