import type { PhysicsCard } from '../engine/types'

export const physicsCards: PhysicsCard[] = [
  // 第一章：惯性星
  { id: '1-1', chapter: 1, level: 1, isBoss: false, intuitionName: '推一下停不下来', formalName: '牛顿第一定律（惯性定律）', intuitionDesc: '没人推也没人挡，动的东西永远动，停的东西永远停。', formula: '一切物体在没有受到外力作用时，总保持静止状态或匀速直线运动状态。', lifeExample: '公交车急刹车时乘客身体突然向前倾——身体想保持原来的运动状态。' },
  { id: '1-2', chapter: 1, level: 2, isBoss: false, intuitionName: '大块头更倔', formalName: '惯性及其大小', intuitionDesc: '东西越重越"犟"，越难让它启动，也越难让它停下。', formula: '惯性只与质量有关，质量越大惯性越大。', lifeExample: '满载大卡车比空载小轿车刹车距离长得多。' },
  { id: '1-3', chapter: 1, level: 3, isBoss: false, intuitionName: '两个力拉平手', formalName: '二力平衡条件', intuitionDesc: '两个力大小一样、方向相反、在一条直线上，谁也赢不了谁。', formula: '作用在同一物体上的两个力，大小相等、方向相反、作用在同一直线上时二力平衡。', lifeExample: '静止在桌上的书——重力与支持力平衡。' },
  { id: '1-4', chapter: 1, level: 4, isBoss: false, intuitionName: '刹车的"飞来横祸"', formalName: '惯性现象（惯性的危害与防护）', intuitionDesc: '车停了，人还想往前飞，所以要用东西拦住他。', formula: '急刹车时车受力减速，乘员因惯性保持原速继续向前。', lifeExample: '汽车安全带、安全气囊——乘车要系安全带。' },
  { id: '1-5', chapter: 1, level: 5, isBoss: true, intuitionName: '你推我，我也推你', formalName: '牛顿第三定律（作用力与反作用力）', intuitionDesc: '你给墙一拳，墙同时给你一拳，力气一样大、方向相反。', formula: '两个物体间的作用力和反作用力总是大小相等、方向相反：F = −F′。', lifeExample: '火箭向下喷气、气体反推火箭升空。' },

  // 第二章：重力星
  { id: '2-1', chapter: 2, level: 1, isBoss: false, intuitionName: '苹果为什么不往上飞', formalName: '重力与万有引力', intuitionDesc: '所有东西都被地球往下拉，这个力叫重力。', formula: '物体受到的重力 G = mg，方向竖直向下。', lifeExample: '苹果从树上掉下来——重力使它向下运动。' },
  { id: '2-2', chapter: 2, level: 2, isBoss: false, intuitionName: '跳得越高摔得越惨', formalName: '重力势能与动能', intuitionDesc: '位置越高，重力做的功越多；落下来时，势能变成动能。', formula: '重力势能 Ep = mgh，动能 Ek = ½mv²。', lifeExample: '跳水运动员从高台跳下，越落越快。' },
  { id: '2-3', chapter: 2, level: 3, isBoss: false, intuitionName: '自由下落的感觉', formalName: '自由落体运动', intuitionDesc: '如果没有空气阻力，所有东西下落一样快！', formula: '自由落体 h = ½gt²，v = gt，与质量无关。', lifeExample: '真空中的羽毛和铁球同时落地。' },
  { id: '2-4', chapter: 2, level: 4, isBoss: false, intuitionName: '下落有极限', formalName: '终端速度', intuitionDesc: '有空气阻力时，下落速度不会无限增大，最终会匀速下落。', formula: '当空气阻力 = 重力时，达到终端速度，加速度为零。', lifeExample: '跳伞运动员张开伞后匀速下落。' },
  { id: '2-5', chapter: 2, level: 5, isBoss: true, intuitionName: '重力可以变方向', formalName: '超重与失重', intuitionDesc: '加速上升感觉变重，加速下降感觉变轻，自由下落就"没重量"了。', formula: '超重：N > mg；失重：N < mg；完全失重：N = 0。', lifeExample: '电梯启动上升时感觉身体变重，下降时感觉变轻。' },

  // 第三章：弹力星
  { id: '3-1', chapter: 3, level: 1, isBoss: false, intuitionName: '弹弹弹，弹到天边', formalName: '弹性与弹力', intuitionDesc: '有些东西被压了会恢复原样，恢复时产生弹力。', formula: '弹力产生条件：物体发生弹性形变。弹簧弹力 F = kx。', lifeExample: '弹簧被压缩后弹回，蹦床把你弹起来。' },
  { id: '3-2', chapter: 3, level: 2, isBoss: false, intuitionName: '撞车谁吃亏', formalName: '动量守恒', intuitionDesc: '碰撞前后，总动量不变——轻的撞重的，轻的弹飞得远。', formula: 'm₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′（动量守恒定律）。', lifeExample: '台球碰撞——白球撞红球，白球停下红球飞出。' },
  { id: '3-3', chapter: 3, level: 3, isBoss: false, intuitionName: '一碰就飞', formalName: '弹性碰撞', intuitionDesc: '完全弹性碰撞，动能也守恒——碰完一点都不浪费。', formula: '弹性碰撞：动量守恒 + 动能守恒，碰后完全分离。', lifeExample: '牛顿摆——一个球撞入，另一个球弹出，其余不动。' },
  { id: '3-4', chapter: 3, level: 4, isBoss: false, intuitionName: '碰到就粘', formalName: '完全非弹性碰撞', intuitionDesc: '碰撞后粘在一起，损失最多动能——但动量还是守恒。', formula: '完全非弹性碰撞：碰后速度相同，动能损失最大。', lifeExample: '两块橡皮泥碰撞后粘在一起。' },
  { id: '3-5', chapter: 3, level: 5, isBoss: true, intuitionName: '反弹的学问', formalName: '恢复系数', intuitionDesc: '碰撞后分离速度与碰撞前接近速度的比值，决定弹多远。', formula: '恢复系数 e = 分离速度/接近速度，e=1完全弹性，e=0完全非弹性。', lifeExample: '篮球弹得高（e≈0.8），泥球弹不起来（e≈0）。' },

  // 第四章：阻力星
  { id: '4-1', chapter: 4, level: 1, isBoss: false, intuitionName: '空气不是空的', formalName: '摩擦力', intuitionDesc: '两个接触面之间有阻碍运动的力，叫摩擦力。', formula: '滑动摩擦力 f = μN，μ为摩擦系数，N为正压力。', lifeExample: '冰面滑溜（摩擦小），砂纸粗糙（摩擦大）。' },
  { id: '4-2', chapter: 4, level: 2, isBoss: false, intuitionName: '水比空气更"黏"', formalName: '流体阻力', intuitionDesc: '在液体中运动比空气中阻力大得多，形状越流线型阻力越小。', formula: '流体阻力与速度平方成正比，与截面积和形状有关。', lifeExample: '鱼的身体流线型——减小水中阻力。' },
  { id: '4-3', chapter: 4, level: 3, isBoss: false, intuitionName: '风推着你走', formalName: '风力与压强', intuitionDesc: '风就是空气流动产生的力，迎风面大受力大。', formula: '风力与风速平方成正比，与迎风面积成正比。', lifeExample: '大风天撑伞走路很费力——风在推你。' },
  { id: '4-4', chapter: 4, level: 4, isBoss: false, intuitionName: '跑不快了', formalName: '终端速度与空气阻力', intuitionDesc: '下落速度越快，空气阻力越大，最终阻力等于重力，不再加速。', formula: '终端速度 v = √(2mg/ρAC)，与质量、截面积、空气密度有关。', lifeExample: '雨滴不会无限加速——达到终端速度后匀速下落。' },
  { id: '4-5', chapter: 4, level: 5, isBoss: true, intuitionName: '摩擦力是敌是友', formalName: '摩擦力的利与弊', intuitionDesc: '摩擦力让你能走路、能刹车，但也让机器磨损、消耗能量。', formula: '有益摩擦增大（鞋底纹路），有害摩擦减小（润滑油）。', lifeExample: '没有摩擦力，人走不了路，车刹不住——摩擦力是双刃剑。' },

  // 第五章：引力星
  { id: '5-1', chapter: 5, level: 1, isBoss: false, intuitionName: '星星互相吸引', formalName: '万有引力定律', intuitionDesc: '任何两个物体之间都有引力，质量越大距离越近，引力越大。', formula: 'F = GMm/r²，G为引力常数，M和m为质量，r为距离。', lifeExample: '地球绕太阳转——太阳引力拉着地球。' },
  { id: '5-2', chapter: 5, level: 2, isBoss: false, intuitionName: '绕圈圈不跑掉', formalName: '圆周运动与向心力', intuitionDesc: '做圆周运动需要向心力，没有向心力就飞出去。', formula: '向心力 F = mv²/r，方向指向圆心。', lifeExample: '甩绳子上的球——绳子提供向心力，松手球就飞走。' },
  { id: '5-3', chapter: 5, level: 3, isBoss: false, intuitionName: '两颗星之间的平衡点', formalName: '拉格朗日点', intuitionDesc: '两颗星之间有5个特殊位置，小物体在这些点上可以保持相对静止。', formula: '拉格朗日点：两个大天体引力与离心力平衡的位置。', lifeExample: '詹姆斯·韦伯太空望远镜停在日地L2点。' },
  { id: '5-4', chapter: 5, level: 4, isBoss: false, intuitionName: '借力飞更远', formalName: '引力弹弓效应', intuitionDesc: '借助行星引力加速，像甩弹弓一样飞得更快更远。', formula: '引力弹弓：利用行星运动方向与飞船相对速度的叠加来加速。', lifeExample: '旅行者号借助木星引力弹弓飞出太阳系。' },
  { id: '5-5', chapter: 5, level: 5, isBoss: true, intuitionName: '三颗星怎么走', formalName: '三体问题', intuitionDesc: '三颗星的引力互相影响，运动轨迹极其复杂，无法精确预测。', formula: '三体问题：三个天体在引力作用下的运动，一般无解析解。', lifeExample: '《三体》小说中三颗太阳的混沌运动——不可预测。' },

  // 第六章：能量星
  { id: '6-1', chapter: 6, level: 1, isBoss: false, intuitionName: '高处的东西有"劲儿"', formalName: '重力势能', intuitionDesc: '位置越高，重力势能越大，可以转化为更多的动能。', formula: '重力势能 Ep = mgh，h为相对参考面的高度。', lifeExample: '水坝蓄水——高处的水有势能，可以发电。' },
  { id: '6-2', chapter: 6, level: 2, isBoss: false, intuitionName: '跑得快更有力', formalName: '动能', intuitionDesc: '速度越快，动能越大，撞到东西越"狠"。', formula: '动能 Ek = ½mv²，速度对动能的影响比质量更大。', lifeExample: '高速公路上车速越快，刹车距离越长——动能大。' },
  { id: '6-3', chapter: 6, level: 3, isBoss: false, intuitionName: '能量变来变去', formalName: '动能与势能的相互转化', intuitionDesc: '从高处滑下，势能变动能；冲上高处，动能变势能。', formula: '在只有重力做功时，动能和势能互相转化，总量不变。', lifeExample: '过山车——从最高点冲下，势能变动能，再冲上去，动能变势能。' },
  { id: '6-4', chapter: 6, level: 4, isBoss: false, intuitionName: '能量不会凭空消失', formalName: '机械能守恒定律', intuitionDesc: '没有摩擦力时，动能加势能的总和不变——能量守恒。', formula: 'E₁ = E₂，即 ½mv₁² + mgh₁ = ½mv₂² + mgh₂。', lifeExample: '单摆摆动——左右两侧高度相同，能量在动能和势能间转换。' },
  { id: '6-5', chapter: 6, level: 5, isBoss: true, intuitionName: '永动机不可能', formalName: '能量守恒定律', intuitionDesc: '能量不会凭空产生也不会凭空消失，只能从一种形式转化为另一种。', formula: '能量守恒定律：能量既不会凭空产生，也不会凭空消失，只能相互转化。', lifeExample: '永动机不可能实现——能量守恒，不可能无中生有。' },
]
