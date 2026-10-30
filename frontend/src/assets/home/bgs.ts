import bg1 from './bg1.jpg'
import bg2 from './bg2.jpg'
import bg3 from './bg3.jpg'
import bg4 from './bg4.jpg'
import bg5 from './bg5.jpg'

/** 全部风景背景 */
export const HOME_BGS = [bg1, bg2, bg3, bg4, bg5]

let _current: string | null = null

/**
 * 会话级共享背景: 整个应用(主页/继续游戏/成就/设置)共用同一张,
 * 首次调用随机取一张, 之后保持不变; 只有整页刷新/重新加载才会再随机。
 * 这样页面间导航背景一致, 不会跳变。
 */
export function homeBg(): string {
  if (!_current) _current = HOME_BGS[Math.floor(Math.random() * HOME_BGS.length)]
  return _current
}
