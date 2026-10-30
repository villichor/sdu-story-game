import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { storyApi } from '../../api'
import type { ChoiceOption, CurrentStoryVO, StoryLine } from '../../api/types'
import { resource } from '../../resources'
import { bustUrl } from '../../resources/busts'
import { collectionName } from '../../resources/collections'
import { collectionApi } from '../../api'
import { parseEffect, assetUrl } from './effects'
import { SettingsModal } from '../SettingsModal'
import MinigameLuggage from './MinigameLuggage'
import FadeBackground from './FadeBackground'
import { SceneLabel } from './SceneLabel'
import { theme } from '../../theme'
import { TIMING, formatSceneTitle } from '../../lib/constants'
import { useSettings } from '../../lib/useSettings'

type Status = 'loading' | 'error' | 'ready'

/** 用 GSAP 时间线播放转场效果(光瞳/柔光/横移) */
function playTransition(el: HTMLDivElement | null, type: string) {
  if (!el) return
  const curtains = el.querySelectorAll<HTMLDivElement>('.fx-curtain')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  gsap.killTweensOf(el)
  gsap.killTweensOf(curtains)
  // 睁眼时继承闭眼留下的黑屏(避免透明间隙露出新背景); 其它转场先重置
  if (type.includes('eyes_open')) gsap.set(el, { autoAlpha: 1, background: '#000' })
  else gsap.set(el, { autoAlpha: 0, background: 'transparent' })
  if (reduced) return
  // 默认把两块帘子收回边缘(不可见), 再用在闭眼/睁眼时向中间合拢
  gsap.set(curtains, { background: '#000' })

  const tl = gsap.timeline({ onComplete: () => { if (!type.includes('eyes_close')) gsap.set(el, { autoAlpha: 0 }) } })

  // 默认把两块帘子收薄并隐藏, 闭眼/睁眼时再向中间合拢
  gsap.set(curtains, { scaleY: 0.02, autoAlpha: 0 })

  if (type.includes('eyes_close') || type.includes('eyes_open')) {
    // 闭眼/睁眼: 黑场遮罩(黑场淡入→换背景→黑场淡出), 遮罩全覆盖, 无白帧
    gsap.set(el, { background: '#000' })
    if (type.includes('eyes_close')) {
      tl.to(el, { autoAlpha: 1, duration: 0.9, ease: 'sine.inOut' }) // 淡到黑
    } else {
      // 睁眼: 先保持全黑(黑幕里完成换背景), 再缓慢亮出 —— 即"先黑屏→换背景→睁眼"
      gsap.set(el, { autoAlpha: 1 })
      tl.to(el, { autoAlpha: 1, duration: 0.5 })
        .to(el, { autoAlpha: 0, duration: 1.2, ease: 'sine.inOut' }) // 从黑亮出
    }
  } else if (type === 'dream_wake') {
    // 醒梦: 淡到黑 → 全黑(黑幕里换背景) → 从黑亮出
    gsap.set(el, { background: '#000' })
    tl.to(el, { autoAlpha: 1, duration: 0.55, ease: 'sine.inOut' })
      .to(el, { autoAlpha: 1, duration: 0.7 })
      .to(el, { autoAlpha: 0, duration: 0.95, ease: 'sine.inOut' })
  } else if (type.startsWith('memory')) {
    // 记忆: 暖色(进)/冷色(出) 的"记忆胶片"色调洗涤
    const warm = type === 'memory_enter'
    gsap.set(el, {
      background: warm
        ? 'linear-gradient(125deg, #fff3d6 0%, #ffd9a0 45%, #c88a4f 100%)'
        : 'linear-gradient(125deg, #eaf1f8 0%, #b9c9dc 45%, #7f93ad 100%)',
    })
    tl.to(el, { autoAlpha: 0.55, duration: 0.7, ease: 'sine.inOut' })
      .to(el, { autoAlpha: 0, duration: 0.95, ease: 'sine.inOut' })
  } else if (type.startsWith('train')) {
    // 火车转场: 白光横掠特效已删除(光带残留卡屏), 改为黑场淡入淡出
    gsap.set(el, { background: '#0a0a0c' })
    tl.to(el, { autoAlpha: 1, duration: 0.9, ease: 'sine.inOut' })
      .to(el, { autoAlpha: 0, duration: 0.95, ease: 'sine.inOut' })
  } else {
    // 默认: 黑场淡入淡出
    gsap.set(el, { background: '#0a0a0c' })
    tl.to(el, { autoAlpha: 1, duration: 0.9, ease: 'sine.inOut' })
      .to(el, { autoAlpha: 0, duration: 0.95, ease: 'sine.inOut' })
  }
}

interface Props {
  saveId: number
  onExit?: () => void
}

export default function StoryPlayer({ saveId, onExit }: Props) {
  const [settings] = useSettings()
  const [story, setStory] = useState<CurrentStoryVO | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)

  // ---- 演出指令相关状态 ----
  const [sceneKey, setSceneKey] = useState<string | null>(null)
  const [cgKey, setCgKey] = useState<string | null>(null)
  const [sceneKeyNode, setSceneKeyNode] = useState<number | null>(null)
  const [cgKeyNode, setCgKeyNode] = useState<number | null>(null)
  const [montage, setMontage] = useState(false)
  const [collectionToast, setCollectionToast] = useState<string | null>(null)
  const [achvToast, setAchvToast] = useState<{ name: string; desc: string } | null>(null)
  const [minigame, setMinigame] = useState<string | null>(null)
  const transitionRef = useRef<HTMLDivElement>(null)
  // 走马灯起始节点: 同一节点内 montage 持续(逐行自动推进), 换节点时重置
  const montageNodeRef = useRef<number | null>(null)
  // 重选: 记录每个选择点已试过的选项(nodeKey -> choiceId 列表)。用 ref 保证 effect 读到最新值。
  const triedChoicesRef = useRef<Record<string, string[]>>({})
  const [skippingIntro, setSkippingIntro] = useState(false)
  const [triedNotice, setTriedNotice] = useState<string | null>(null)
  const [holdText, setHoldText] = useState(false)
  const holdTimerRef = useRef<number | null>(null)
  const eyesTransitionRef = useRef<string | null>(null)
  // 华岗篇第 2/3 次选择记录(用于第 4 次选择的失败判定), sessionStorage 持久化避免刷新丢失
  const choiceFlagsRef = useRef<{ second?: string; third?: string }>({})
  // 第 4 次选择失败剧情(全屏展示失败反馈, 点击后回到选项重选)
  const [failStory, setFailStory] = useState<string | null>(null)
  // 失败过的选项(变黑不可再选), sessionStorage 持久化
  const [failedChoices, setFailedChoices] = useState<Record<string, string[]>>({})
  // 隐藏 CG(无声的奔走): 仅文字覆盖层, 背景不变; ref 同步阻塞线性自动推进
  const [hiddenCg, setHiddenCg] = useState(false)
  const hiddenCgRef = useRef(false)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('hua_choice_flags')
      if (raw) choiceFlagsRef.current = JSON.parse(raw)
      const rawFail = sessionStorage.getItem('hua_failed_choices')
      if (rawFail) setFailedChoices(JSON.parse(rawFail))
    } catch { /* 忽略 */ }
  }, [])
  // 新周目(回到入口节点): 清空选择记录与失败记录, 避免旧记录影响新流程
  useEffect(() => {
    if (story?.node?.nodeCode === 'hua_prologue') {
      choiceFlagsRef.current = {}
      setFailedChoices({})
      try {
        sessionStorage.removeItem('hua_choice_flags')
        sessionStorage.removeItem('hua_failed_choices')
      } catch { /* 忽略 */ }
    }
  }, [story?.node?.nodeCode])
  // 闭眼后需要睁眼: 记录闭眼发生时的节点 id; 推进到新节点后若首句无 eyes_open, 前端自动补播睁眼
  const eyesCloseNodeRef = useRef<number | null>(null)
  // 背景切换后, 文字稍作延迟(<0.3s)再出现, 避免"换背景+台词"同时出显得突兀
  const [bgTextDelay, setBgTextDelay] = useState(false)
  const prevBgIdRef = useRef<string | null>(null)
  const bgTextTimerRef = useRef<number | null>(null)

  // 弹出成就解锁 toast(后端 PATCH /position 返回 unlockedAchievements)
  function popAchvToasts(achvs?: { id: number; name: string; description: string }[] | null) {
    if (!achvs?.length) return
    // 逐个弹, 每个间隔 TIMING.ACHV_TOAST_GAP, 自动消失
    achvs.forEach((a, i) => {
      const t = window.setTimeout(() => {
        setAchvToast({ name: a.name, desc: a.description })
        const closeT = window.setTimeout(() => setAchvToast(null), TIMING.ACHV_TOAST_DURATION)
        popTimersRef.current.push(closeT)
      }, i * TIMING.ACHV_TOAST_GAP)
      popTimersRef.current.push(t)
    })
  }
  const popTimersRef = useRef<number[]>([])

  /** 统一清理: 组件卸载时清掉所有 ref 持有的定时器, 防止内存泄漏 */
  useEffect(() => {
    return () => {
      popTimersRef.current.forEach((t) => window.clearTimeout(t))
      popTimersRef.current = []
      if (holdTimerRef.current) { window.clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
      if (bgTextTimerRef.current) { window.clearTimeout(bgTextTimerRef.current); bgTextTimerRef.current = null }
    }
  }, [])

  /** ESC 快捷键: 打开/关闭 设置弹窗 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // 避开 FailStoryBeat/SubtitleBeat 这类全屏覆盖层(它们也需要 ESC 交互)
      if (failStory || hiddenCg) return
      e.preventDefault()
      setShowSettings((s) => !s)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [failStory, hiddenCg])

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      setStory(await storyApi.current(saveId))
      setStatus('ready')
    } catch (e) {
      setError((e as Error).message)
      setStatus('error')
    }
  }, [saveId])

  useEffect(() => {
    void load()
  }, [load])

  // 切台词/切节点时, 用 GSAP 让对话区优雅进入(尊重 reduced-motion)
  useEffect(() => {
    if (!stageRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    gsap.fromTo(stageRef.current, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', overwrite: true })
  }, [story?.node.id, story?.currentLineIndex])

  // 处理当前台的演出指令(effectRef): 切场景/展示CG/转场/覆盖层/收集/小游戏
  useEffect(() => {
    if (!story?.node) return
    const cur = story?.node?.lines?.[story.currentLineIndex] ?? null
    const eff = parseEffect(cur?.effectRef ?? null)
    // scene/cg 指令在节点内跨句保持; sceneKey/cgKey 记录其所属节点, 只在"同一节点内"生效
    // 换句时重置瞬态效果, 应用本句指令
    setCollectionToast(null)
    setMinigame(null)
    setHoldText(false)
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
    eyesTransitionRef.current = null
    // 走马灯跨节点自动结束(换节点即重置)
    if (montageNodeRef.current !== null && montageNodeRef.current !== story.node.id) { setMontage(false); montageNodeRef.current = null }
    if (eff.kind === 'scene') { setSceneKey(eff.value); setSceneKeyNode(story.node.id); setCgKey(null); setCgKeyNode(null) }
    else if (eff.kind === 'cg') {
      // 隐藏 CG「无声的奔走」: 只有文字, 背景不变(不切 cgKey)
      if (eff.value === 'hua/act4/silent_running') {
        hiddenCgRef.current = true
        setHiddenCg(true)
      } else {
        setCgKey(eff.value); setCgKeyNode(story.node.id); setSceneKey(null); setSceneKeyNode(null)
      }
    }
    else if (eff.kind === 'montage') { setMontage(true); montageNodeRef.current = story.node.id }
    else if (eff.kind === 'transition') {
      console.log('[转场] 触发', eff.value)
      if (eff.value.includes('eyes_close')) {
        // 闭眼: 不在加载时播、不按住文字; 改为"点击推进时播"(先显示内容, 推进时才闭眼到黑)
        eyesTransitionRef.current = eff.value
        // 记录闭眼发生的节点, 推进到新节点后自动补播睁眼
        eyesCloseNodeRef.current = story.node.id
      } else {
        // 睁眼/其它转场: 到达时播(黑→睁开露出新场景 / 等特效), 内容后显示
        eyesCloseNodeRef.current = null
        playTransition(transitionRef.current, eff.value)
        setHoldText(true)
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
        holdTimerRef.current = window.setTimeout(() => { console.log('[转场] hold清除'); setHoldText(false); holdTimerRef.current = null }, TIMING.TRANSITION_HOLD_CLEAR)
      }
    } else if (eff.kind === 'collection') {
      void collectionApi.add(eff.value)
      setCollectionToast(collectionName(eff.value))
      const t = setTimeout(() => setCollectionToast(null), TIMING.COLLECTION_TOAST_DURATION)
      return () => clearTimeout(t)
    } else if (eff.kind === 'minigame') {
      setMinigame(eff.value)
    }
    // 闭眼后推进到新节点, 若当前句没有 eyes_open 则自动补播睁眼转场
    if (eyesCloseNodeRef.current !== null && eyesCloseNodeRef.current !== story.node.id) {
      eyesCloseNodeRef.current = null
      setHoldText(true)
      const t = window.setTimeout(() => {
        playTransition(transitionRef.current, 'eyes_open_blur')
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
        holdTimerRef.current = window.setTimeout(() => { setHoldText(false); holdTimerRef.current = null }, TIMING.TRANSITION_HOLD_CLEAR)
      }, TIMING.EYES_AUTO_OPEN_DELAY)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.node.id, story?.currentLineIndex])

  // 重选快进: 回环到"已试过选项"的选择节点时, 跳过 intro 直接跳到选项
  useEffect(() => {
    const node = story?.node
    if (!node) return
    const nk = node.nodeCode || String(node.id)
    const tried = triedChoicesRef.current[nk]
    // 首次访问(没试过选项) 或 已在选项处 -> 正常
    if (!tried?.length) return
    if (story && story.currentLineIndex >= node.lines.length) return
    console.log('[重选快进] 跳过 intro @', nk)
    setSkippingIntro(true)
    let cancelled = false
    ;(async () => {
      let idx = story?.currentLineIndex ?? 0
      let guard = 0
      let res: Awaited<ReturnType<typeof storyApi.position>> | null = null
      // 只累积到最后, 不逐行 setStory(避免渲染 intro 闪一下)
      while (!cancelled && idx < node.lines.length && guard < TIMING.FASTFORWARD_GUARD) {
        try {
          res = await storyApi.position(saveId, node.id, idx, idx + 1)
          idx = res.currentLineIndex
        } catch (e) { console.warn('快进 advance 失败', e); break }
        guard++
        await new Promise((r) => setTimeout(r, TIMING.FASTFORWARD_STEP))
      }
      if (!cancelled && res) {
        setStory((prev) => prev
          ? {
              ...prev,
              currentLineIndex: res!.currentLineIndex,
              interactionType: res!.interactionType,
              node: res!.choices && res!.choices.length ? { ...prev.node, choices: res!.choices } : prev.node,
            }
          : prev)
        popAchvToasts(res.unlockedAchievements)
      }
      if (!cancelled) setSkippingIntro(false)
    })()
    return () => { cancelled = true; setSkippingIntro(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.node.id, story?.currentLineIndex])

  // 蒙太奇: "走马灯" —— 自动推进本节点各行(每行显示其图片+台词), 到节点末(linear/finished)结束
  useEffect(() => {
    if (!montage || !story?.node || busy) return
    if (story.interactionType !== 'playing') { setMontage(false); return }
    const iv = setInterval(async () => {
      if (story.interactionType !== 'playing') { setMontage(false); return }
      try {
        const res = await storyApi.position(saveId, story.node.id, story.currentLineIndex, story.currentLineIndex + 1)
        setStory((prev) => prev
          ? { ...prev, currentLineIndex: res.currentLineIndex, interactionType: res.interactionType, node: res.choices && res.choices.length ? { ...prev.node, choices: res.choices } : prev.node }
          : prev)
        popAchvToasts(res.unlockedAchievements)
        if (res.interactionType !== 'playing') setMontage(false)
      } catch (e) { console.warn('蒙太奇推进失败', e); setMontage(false) }
    }, TIMING.MONTAGE_INTERVAL)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montage, story?.currentLineIndex, story?.interactionType, story?.node?.id, busy, saveId])

  // 线性(节点末句且有后继): 自动推进到下一节点, 避免"没界面可点"卡住
  const linearAdvancingRef = useRef(false)
  useEffect(() => {
    if (story?.interactionType !== 'linear' || busy) return
    if (linearAdvancingRef.current) return
    if (hiddenCgRef.current) return // 隐藏 CG 文字展示期间不自动推进
    linearAdvancingRef.current = true
    void (async () => {
      try {
        // 闭眼转场: 先播闭眼到黑, 再推进(背景在黑幕后换)
        const eyes = eyesTransitionRef.current
        if (eyes && eyes.includes('eyes_close')) {
          setHoldText(true)
          playTransition(transitionRef.current, eyes)
          await new Promise((r) => setTimeout(r, TIMING.TRANSITION_TOTAL_MS / 2))
          eyesTransitionRef.current = null
      }
      const res = await storyApi.advance(saveId, story.node.id, story.currentLineIndex, null)
      setStory(res)
    } catch (e) { console.warn('线性推进失败', e) }
      finally { linearAdvancingRef.current = false }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.node.id, story?.currentLineIndex, story?.interactionType, busy, saveId, hiddenCg])

  // 背景切换后, 文字延迟 <0.3s 再出现(避免"换背景+台词"同出突兀)
  useEffect(() => {
    const nodeCg = story?.node?.cgRef && assetUrl(story.node.cgRef) ? story.node.cgRef : null
    const id = cgKey ?? sceneKey ?? nodeCg ?? story?.node?.backgroundRef ?? 'none'
    if (prevBgIdRef.current === id) return
    prevBgIdRef.current = id
    if (bgTextTimerRef.current) clearTimeout(bgTextTimerRef.current)
    setBgTextDelay(true)
    bgTextTimerRef.current = window.setTimeout(() => { setBgTextDelay(false); bgTextTimerRef.current = null }, TIMING.BG_TEXT_DELAY_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cgKey, sceneKey, story?.node?.id, story?.node?.cgRef, story?.node?.backgroundRef])

  const node = story?.node
  const line = useMemo(() => {
    const raw = node && story && story.currentLineIndex < node.lines.length ? node.lines[story.currentLineIndex] : null
    if (!raw) return null
    // 结尾文案修正: 现代尾声中"我"是奶奶(孙女提问对象), 后端文本误写为"爷爷"
    if (raw.content === '爷爷，这本相册里写的都是真的吗？') {
      return { ...raw, content: '奶奶，这本相册里写的都是真的吗？' }
    }
    return raw
  }, [node, story])

  const isPlaying = story?.interactionType === 'playing'
  const isChoice = story?.interactionType === 'choice'
  const isFinished = story?.interactionType === 'finished'
  const showLine = isPlaying && line != null

  // 重选快进(同步判定): 试过选项的节点且还没到选项处 → 快进即将/正在进行。
  // 渲染期就算出来(不等 useEffect), 避免快进首帧"立绘+台词"画面一闪而过。
  const nkNow = node ? node.nodeCode || String(node.id) : ''
  const skippingNow =
    skippingIntro ||
    (!!node && (triedChoicesRef.current[nkNow]?.length ?? 0) > 0 && !!isPlaying && (story?.currentLineIndex ?? 0) < node.lines.length)

  const handleNext = useCallback(async () => {
    if (!story || busy) return
    console.log('[推进] 点击, interaction=', story.interactionType, 'node=', story.node.nodeCode, 'line=', story.currentLineIndex)
    setBusy(true)
    try {
      if (story.interactionType === 'playing') {
        // 眼睛转场: 点击推进时先播(闭眼到黑), 再跳下一句(背景在黑幕后 snap 换)
        const eyes = eyesTransitionRef.current
        if (eyes) {
          setHoldText(true) // 特效期间按住文字
          playTransition(transitionRef.current, eyes)
          await new Promise((r) => setTimeout(r, eyes.includes('eyes_close') ? TIMING.TRANSITION_TOTAL_MS / 2 : TIMING.TRANSITION_TOTAL_MS)) // 等全黑(睁眼含黑屏保持)
          eyesTransitionRef.current = null
        }
        const res = await storyApi.position(saveId, story.node.id, story.currentLineIndex, story.currentLineIndex + 1)
        setStory((prev) => prev
          ? {
              ...prev,
              currentLineIndex: res.currentLineIndex,
              interactionType: res.interactionType,
              node: { ...prev.node, choices: res.choices?.length ? res.choices : prev.node.choices },
            }
          : prev)
        popAchvToasts(res.unlockedAchievements)
      } else if (story.interactionType === 'linear') {
        const res = await storyApi.advance(saveId, story.node.id, story.currentLineIndex, null)
        setStory(res)
      }
    } catch (e) {
      setError((e as Error).message)
      if ((e as { code?: number }).code === 40901 || (e as { code?: number }).code === 40001) void load()
    } finally {
      setBusy(false)
    }
  }, [story, busy, saveId, load])

  const handleChoice = useCallback(
    async (choice: ChoiceOption) => {
      if (!story || busy) return
      const nk = story.node.nodeCode || String(story.node.id)
      // ---- 华岗篇第 4 次选择(办刊)失败限制 ----
      // 规则: 第2+3次都选A → 第4次选A失败; 第2+3次都选B → 第4次选C失败; 其余(AB/BA)都成功
      if (nk === 'hua_wenshizhe_canteen') {
        const flags = choiceFlagsRef.current
        const second = flags.second
        const third = flags.third
        const letter = choice.orderIndex === 0 ? 'A' : choice.orderIndex === 1 ? 'B' : 'C'
        const fail =
          (second === 'A' && third === 'A' && letter === 'A') ||
          (second === 'B' && third === 'B' && letter === 'C')
        if (fail) {
          // 失败过的选项变黑不可再选(持久化)
          setFailedChoices((prev) => {
            const next = { ...prev, [nk]: Array.from(new Set([...(prev[nk] || []), String(choice.id)])) }
            try { sessionStorage.setItem('hua_failed_choices', JSON.stringify(next)) } catch { /* 忽略 */ }
            return next
          })
          // 失败剧情(文档原文): 逐字展示失败反馈, 点击后回到选项重选
          setFailStory(letter === 'A'
            ? '华岗温和地将稿子退回，指出你“理论有余，但缺乏对现实的深刻体察”。'
            : '你虽然见到了名家，但由于对学术流派了解不深，未能说服他们拿出最核心的手稿。')
          return
        }
      }
      setBusy(true)
      // 记录第 2/3 次选择(第2次=学长节点, 第3次=典礼感想节点)
      // 重选第 2/3 次会改变路线, 第 4 次选择的失败判定随之变化 → 清空第 4 次的失败记录
      const isRouteChoice = nk === 'hua_senior_choice_after_ask' || nk === 'hua_senior_choice_after_quiet' || nk === 'hua_ceremony_speech'
      if (nk === 'hua_senior_choice_after_ask' || nk === 'hua_senior_choice_after_quiet') {
        choiceFlagsRef.current.second = choice.orderIndex === 0 ? 'A' : 'B'
      } else if (nk === 'hua_ceremony_speech') {
        choiceFlagsRef.current.third = choice.orderIndex === 0 ? 'A' : 'B'
      }
      if (isRouteChoice) {
        setFailedChoices((prev) => {
          const next = { ...prev }
          delete next.hua_wenshizhe_canteen
          try { sessionStorage.setItem('hua_failed_choices', JSON.stringify(next)) } catch { /* 忽略 */ }
          return next
        })
      }
      try { sessionStorage.setItem('hua_choice_flags', JSON.stringify(choiceFlagsRef.current)) } catch { /* 忽略 */ }
      // 记录该选择点试过的选项(用于重选时变暗); 用稳定 nodeCode/id 作键, 写入 ref 保证最新
      triedChoicesRef.current[nk] = Array.from(new Set([...(triedChoicesRef.current[nk] || []), String(choice.id)]))
      console.log('[选择已记录] nodeKey=', nk, 'choiceId=', choice.id, 'tried=', triedChoicesRef.current[nk])
      try {
        const res = await storyApi.advance(saveId, story.node.id, story.currentLineIndex, choice.id)
        setStory(res)
      } catch (e) {
        setError((e as Error).message)
        if ((e as { code?: number }).code === 40003 || (e as { code?: number }).code === 40901) void load()
      } finally {
        setBusy(false)
      }
    },
    [story, busy, saveId, load],
  )

  if (status === 'loading') return <div style={styles.center}>加载剧情中…</div>
  if (status === 'error') {
    return (
      <div style={styles.center}>
        <p style={{ color: theme.error }}>{error}</p>
        <button onClick={load} style={styles.btn}>重试</button>
        {onExit && <button onClick={onExit} style={styles.ghost}>返回</button>}
      </div>
    )
  }
  if (!story || !node) return null

  const effNow = parseEffect(line?.effectRef ?? null)
  const speaker = line?.speaker ?? null
  const speakerPortrait = line?.portraitRef ?? null

  // 背景: 蒙太奇/CG 指令 → 显示对应图; scene/cg 只在所属节点内生效, 否则退回节点背景
  // 优先级: 行内CG > 行内场景 > 节点CG > 节点背景; 素材缺失时逐级回退, 绝不把场景弄丢
  const sceneOk = sceneKey != null && sceneKeyNode === node.id
  const cgOk = cgKey != null && cgKeyNode === node.id
  const cgImg = cgOk ? assetUrl(cgKey! as string) : null
  const sceneImg = sceneOk ? assetUrl(sceneKey! as string) : null
  const nodeCgImg = node.cgRef ? assetUrl(node.cgRef) : null
  let backdropImg: string | null = null
  let isCg = false
  if (cgImg) { backdropImg = cgImg; isCg = true }
  else if (sceneImg) { backdropImg = sceneImg; isCg = false }
  else if (nodeCgImg) { backdropImg = nodeCgImg; isCg = true }
  const bgKey = cgImg ? cgKey : sceneImg ? sceneKey : nodeCgImg ? node.cgRef : (node.backgroundRef ?? null)
  const bgId = backdropImg ?? `scene:${bgKey ?? 'none'}`
  const dreamHold = !!line?.effectRef?.includes('dream_wake')
  const bgStyle = backdropImg
    ? { backgroundImage: `url(${backdropImg})` }
    : resource.background(bgKey).style
  // 兜底场景背景始终 cover 全屏; 只有真 CG 才 contain
  if (!backdropImg) isCg = false
  console.log('[背景] bgKey=', bgKey, 'backdropImg=', backdropImg)

  // 黑屏字幕句: 只显示"黑底居中字幕 + 继续", 不显示对话框; 日期类用横幅
  const isSubtitle = effNow.kind === 'overlay' && effNow.value === 'center_text_dark'
  const isDateOverlay = effNow.kind === 'overlay' && effNow.value.startsWith('date')

  return (
    <div style={styles.root} onClick={() => { if (isPlaying && showLine && !line?.content && !isSubtitle && !holdText) void handleNext() }}>
      <FadeBackground id={bgId} style={bgStyle} hold={dreamHold} contain={isCg} />
      <div style={styles.vignette} />

      {/* 顶栏 */}
      <div style={styles.topBar}>
        <div style={styles.sceneLabelWrap}>
          <SceneLabel text={formatSceneTitle(node?.title)} triggerKey={bgId} />
        </div>
        <button style={styles.escBtn} className="lift" onClick={() => setShowSettings(true)}>设置 Esc</button>
      </div>

      {/* 人物半身像(左下角, 头+肩); 重选快进/走马灯期间隐藏, 避免"只有立绘"的画面一闪而过 */}
      {!skippingNow && !montage && (() => {
        // 现代场景(序幕/尾声)不显示主控立绘: 立绘是 1950 年代学生形象, 与现代家居背景年龄冲突
        const modernScene = node.nodeCode === 'hua_prologue' || node.nodeCode === 'hua_epilogue'
        const isProtagonist = !!speakerPortrait && (speakerPortrait.startsWith('protagonist') || speakerPortrait.startsWith('hua/protagonist'))
        if (modernScene && isProtagonist) return null
        const bust = bustUrl(speakerPortrait)
        if (!bust) return null
        return <img key={speakerPortrait} src={bust} loading="lazy" style={styles.bustImg} alt="bust" />
      })()}
      {speaker && !skippingNow && !montage && <div style={styles.nameTag}>{speaker}</div>}

      {/* 走马灯: 屏幕中央浮现当前行台词(随换行淡入淡出, 背景同步交叉溶解) */}
      {montage && line?.content && (
        <div key={line.id} style={styles.montageOverlay}>
          <div style={styles.montageLine}>{line.content}</div>
        </div>
      )}

      {/* 舞台(选择仅为占位; 结束由结尾弹层接管) */}
      <div style={styles.stage} ref={stageRef}>
      </div>

      {/* 底部文字区(galgame): 台词/线性推进 显示文字, 选项时在文字框位置列出选项; 重选快进/走马灯时隐藏 */}
      {!isSubtitle && !isFinished && !skippingNow && !montage && !hiddenCg && (
        isChoice && node.choices.length > 0 ? (
          <>
            <div style={styles.choiceBand} role="radiogroup" aria-label="剧情选项">
              {node.choices.map((c) => {
                const nk = node.nodeCode || String(node.id)
                const tried = triedChoicesRef.current[nk]?.includes(String(c.id))
                const failed = failedChoices[nk]?.includes(String(c.id))
                return (
                  <button
                    key={c.id}
                    role="radio"
                    aria-checked={tried}
                    aria-disabled={busy || !!failed}
                    aria-label={`选择: ${c.choiceText}${tried ? ' (已尝试)' : ''}${failed ? ' (失败)' : ''}`}
                    style={{ ...styles.optionBtn, ...(tried ? styles.optionTried : {}), ...(failed ? styles.optionFailed : {}) }}
                    className="lift"
                    disabled={busy || !!failed}
                    onClick={() => {
                      if (failed) return
                      if (tried) {
                        setTriedNotice('这个想法试过了，或许该换个思路……')
                        setTimeout(() => setTriedNotice(null), TIMING.TRIED_NOTICE_DURATION)
                        return
                      }
                      handleChoice(c)
                    }}
                  >
                    {c.choiceText}
                  </button>
                )
              })}
            </div>
            {triedNotice && <div style={styles.triedNotice}>{triedNotice}</div>}
          </>
        ) : isChoice && node.choices.length === 0 ? (
          <div style={styles.choiceBand}>
            <div style={styles.optionBtn}>此节点缺少选项</div>
            <button style={{ ...styles.optionBtn, background: theme.gold }} onClick={load}>重新加载</button>
          </div>
        ) : (
          <DialogueBand
            line={showLine ? (line?.effectRef === 'cg:hua/act4/silent_running' ? { ...line, content: '' } : line) : null}
            busy={busy}
            hold={holdText || bgTextDelay}
            onAdvance={handleNext}
            speedMs={settings.textSpeedMs}
            autoWaitMs={settings.autoWaitMs}
            autoEnabled={settings.autoEnabled}
          />
        )
      )}

      {showSettings && <SettingsModal currentSaveId={saveId} onClose={() => setShowSettings(false)} />}

      {/* 演出覆盖层: 转场 / 居中字幕 / 收集toast / 小游戏 / 章节完成 */}
      <div ref={transitionRef} style={styles.transitionOverlay}>
        <div className="fx-curtain" style={styles.curtainTop} />
        <div className="fx-curtain" style={styles.curtainBottom} />
      </div>
      {effNow.kind === 'overlay' && !isSubtitle && !isDateOverlay && (
        <div style={styles.centerOverlay}>
          <div style={styles.centerOverlayText}>{line?.content || effNow.value}</div>
        </div>
      )}
      {isSubtitle && line && (
        <SubtitleBeat
          line={line}
          busy={busy}
          onAdvance={handleNext}
          speedMs={settings.textSpeedMs}
          autoWaitMs={settings.autoWaitMs}
          autoEnabled={settings.autoEnabled}
        />
      )}
      {failStory && (
        <FailStoryBeat text={failStory} onDone={() => setFailStory(null)} speedMs={settings.textSpeedMs} />
      )}
      {hiddenCg && (
        <HiddenCgBeat
          onDone={() => {
            hiddenCgRef.current = false
            setHiddenCg(false)
            void handleNext()
          }}
          speedMs={settings.textSpeedMs}
        />
      )}
      {isDateOverlay && <div style={styles.dateBanner}>{(() => {
        const raw = effNow.value.replace(/^overlay:|^date_/g, '').replaceAll('_', '-')
        const m = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
        if (m) return `${m[1]} 年 ${Number(m[2])} 月 ${Number(m[3])} 日`
        return raw
      })()}</div>}
      {collectionToast && (
        <div style={styles.collectionToast}>
          <span style={styles.collectionIcon}>✦</span> 获得收集物 · {collectionToast}
        </div>
      )}
      {achvToast && (
        <div style={styles.achvToast}>
          <span style={styles.achvIcon}>🏆</span>
          <div>
            <div style={styles.achvLabel}>成就解锁！</div>
            <div style={styles.achvName}>{achvToast.name}</div>
            <div style={styles.achvDesc}>{achvToast.desc}</div>
          </div>
        </div>
      )}
      {minigame && minigame === 'hua/organize_luggage' && (
        <MinigameLuggage onComplete={() => setMinigame(null)} />
      )}
      {minigame && minigame !== 'hua/organize_luggage' && (
        <div style={styles.minigameOverlay} onClick={() => setMinigame(null)}>
          <div style={styles.minigameCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.minigameTitle}>互动小游戏</div>
            <div style={styles.minigameBody}>{minigame}</div>
            <div style={styles.minigameHint}>小游戏交互待接入, 点击"完成"跳过</div>
            <button style={styles.btn} onClick={() => setMinigame(null)}>完成</button>
          </div>
        </div>
      )}
      {isFinished && (
        <div style={styles.endingOverlay}>
          <div style={styles.endingMark}><span>✦</span></div>
          <div style={styles.endingTitle}>章节达成</div>
          <div style={styles.endingSub}>这段山大人的故事, 已成为你的记忆</div>
          <button style={styles.endingBtn} className="lift" onClick={onExit}>返回主菜单</button>
        </div>
      )}

      <div style={styles.devNote}><span>mock</span></div>
    </div>
  )
}

/** 隐藏 CG「无声的奔走」: 文字逐字显现(不标注隐藏 CG), 点一下出全文, 再点继续 */
const HIDDEN_CG_LINES = [
  '我敲开了后勤处老王的门，求他高抬贵手，没把先生们的书当废纸烧了。',
  '我跑断了腿，找了三拨人，才把那句“平安”的口信，带进了家属院。',
  '',
  '风波没有过去，但课没有停。',
  '',
  '老师就在宿舍里，用粉笔在床板上画图，我们就坐在马扎上听。',
  '',
  '风雨总会过去。',
  '只要还有人愿意听，这方讲台，就永远存在。',
]
function HiddenCgBeat({ onDone, speedMs = 55 }: { onDone: () => void; speedMs?: number }) {
  const total = HIDDEN_CG_LINES.reduce((s, l) => s + l.length, 0)
  const [shown, setShown] = useState(0)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    setShown(0)
    setRevealed(false)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setShown(total); setRevealed(true); return }
    const iv = setInterval(() => {
      setShown((s) => {
        if (s < total) return s + 1
        setRevealed(true)
        return s
      })
    }, speedMs)
    return () => clearInterval(iv)
  }, [total])
  const handleClick = () => {
    if (!revealed) { setShown(total); setRevealed(true); return }
    onDone()
  }
  let offset = 0
  return (
    <div style={styles.hiddenCgOverlay} onClick={handleClick} role="button" aria-label="继续">
      <div style={styles.hiddenCgText}>
        {HIDDEN_CG_LINES.map((l, i) => {
          const start = offset
          offset += l.length
          const visible = Math.max(0, Math.min(l.length, shown - start))
          return <div key={i} style={{ minHeight: '1.05em' }}>{l.slice(0, visible)}</div>
        })}
      </div>
      <div style={styles.failHint}>{revealed ? '▸ 点击继续' : '点击跳过'}</div>
    </div>
  )
}

/** 失败剧情: 逐字蹦出(同一般剧情表现形式), 点一下出全文, 再点回到选项重选 */
function FailStoryBeat({ text, onDone, speedMs }: { text: string; onDone: () => void; speedMs: number }) {
  const [shown, setShown] = useState(0)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    setShown(0)
    setRevealed(false)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setShown(text.length); setRevealed(true); return }
    const iv = setInterval(() => {
      setShown((s) => {
        if (s < text.length) return s + 1
        setRevealed(true)
        return s
      })
    }, speedMs)
    return () => clearInterval(iv)
  }, [text, speedMs])
  const handleClick = () => {
    if (!revealed) { setShown(text.length); setRevealed(true); return }
    onDone()
  }
  return (
    <div style={styles.failOverlay} onClick={handleClick} role="button" aria-label="重新选择">
      <div style={styles.failTitle}>尝试未果</div>
      <div style={styles.failText}>{text.slice(0, shown)}</div>
      <div style={styles.failHint}>{revealed ? '▸ 点击重新选择' : '点击跳过'}</div>
    </div>
  )
}

/** 黑屏居中字幕: 逐字出现 + 「」角标, 点一下出全文, 再点一下继续(和一般剧情文字一致) */
function SubtitleBeat({ line, busy, onAdvance, speedMs, autoWaitMs, autoEnabled }: { line: StoryLine; busy: boolean; onAdvance: () => void; speedMs: number; autoWaitMs: number; autoEnabled: boolean }) {
  const content = line.content || ''
  const [shown, setShown] = useState(content.length)
  const [revealed, setRevealed] = useState(true)
  const autoTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const txt = line.content || ''
    setShown(txt.length)
    setRevealed(true)
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null }
    if (!txt) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    setShown(0)
    setRevealed(false)
    const iv = setInterval(() => setShown((s) => { if (s < txt.length) return s + 1; setRevealed(true); return s }), speedMs)
    return () => { clearInterval(iv); if (autoTimerRef.current) clearTimeout(autoTimerRef.current) }
  }, [line.id, speedMs])

  // 自动播放: 全部显现后等 autoWaitMs 自动推进
  useEffect(() => {
    if (!revealed || !autoEnabled || busy) return
    const t = window.setTimeout(() => { onAdvance() }, autoWaitMs)
    autoTimerRef.current = t
    return () => clearTimeout(t)
  }, [revealed, autoEnabled, autoWaitMs, busy, onAdvance])
  const handleClick = () => {
    if (busy) return
    if (!revealed) { setShown(content.length); setRevealed(true); return }
    onAdvance()
  }
  return (
    <div style={styles.subtitleBeat} onClick={handleClick} role="button" aria-label="继续">
      <div style={styles.subtitleBeatText}><span style={styles.bracket}>「</span>{content.slice(0, shown)}<span style={styles.bracket}>」</span></div>
      <div style={styles.subtitleNextHint}>{revealed ? '▸ 点击继续' : '点击跳过'}</div>
    </div>
  )
}

/** 底部对话带(galgame 风): 打字机逐字 + 点击出全文 + 再点推进; 支持 settings 的速度/自动播放 */
function DialogueBand({ line, busy, hold, onAdvance, speedMs, autoWaitMs, autoEnabled }: { line: StoryLine | null; busy: boolean; hold?: boolean; onAdvance: () => void; speedMs: number; autoWaitMs: number; autoEnabled: boolean }) {
  const content = line?.content?.trim() || ''
  const [shown, setShown] = useState(content.length)
  const [revealed, setRevealed] = useState(true)
  const autoTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const txt = line?.content?.trim() || ''
    // hold(特效)期间: 不打字, 文字为 0; 特效结束后才从 0 逐字出现
    if (hold) { setShown(0); setRevealed(false); return }
    setShown(txt.length)
    setRevealed(true)
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null }
    if (!txt) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    setShown(0)
    setRevealed(false)
    const iv = setInterval(() => {
      setShown((s) => {
        if (s < txt.length) return s + 1
        setRevealed(true)
        return s
      })
    }, speedMs)
    return () => { clearInterval(iv); if (autoTimerRef.current) clearTimeout(autoTimerRef.current) }
  }, [line?.id, line?.content, hold, speedMs])

  // 自动播放: reveal 后等 autoWaitMs 再推进(用户交互会先清除定时器)
  useEffect(() => {
    if (!revealed || !autoEnabled || busy || hold || !content) return
    const t = window.setTimeout(() => { onAdvance() }, autoWaitMs)
    autoTimerRef.current = t
    return () => clearTimeout(t)
  }, [revealed, autoEnabled, autoWaitMs, busy, hold, content, onAdvance])

  const handleClick = () => {
    if (busy || hold) return // 特效期间禁止点击推进
    // 点击过立即取消自动播放定时器(防与手动推进冲突)
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null }
    if (!revealed) {
      setShown(content.length)
      setRevealed(true)
      return
    }
    onAdvance()
  }

  // 空内容行 / 特效(hold)期间 不渲染文字框(避免空框/符号外露), 特效结束再出现
  if (!content || hold) return null
  return (
    <div style={styles.textBand} onClick={handleClick} role="button" aria-label="继续">
      <div style={styles.content}>
        <span style={styles.bracket}>「</span>{content.slice(0, shown)}<span style={styles.bracket}>」</span>
      </div>
      <div style={styles.nextHint}>{revealed ? '▸ 点击继续' : '点击跳过'}</div>
    </div>
  )
}

/** 底部细半透明对话横带(galgame 风): 台词居中, 点击推进 */
const styles = {
  root: { position: 'relative' as const, width: '100%', height: '100vh', overflow: 'hidden', color: theme.text, fontFamily: 'var(--font-body)', userSelect: 'none' as const },
  background: { position: 'absolute' as const, inset: 0, backgroundSize: 'cover', backgroundPosition: 'center', transition: 'background 600ms var(--ease)' },
  vignette: { position: 'absolute' as const, inset: 0, background: 'linear-gradient(180deg, rgba(20,20,22,0.0) 62%, rgba(20,20,22,0.35) 100%)' },
  topBar: { position: 'absolute' as const, top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', zIndex: 6 },
  sceneLabelWrap: { minWidth: 120, minHeight: 32, display: 'flex', alignItems: 'center' },
  pageTag: { fontFamily: 'var(--font-display)', fontSize: 15, color: theme.textSoft, fontWeight: 600, background: 'rgba(255,255,255,0.7)', border: '1px solid ' + theme.border, borderRadius: 8, padding: '4px 12px', backdropFilter: 'blur(4px)' },
  escBtn: { marginLeft: 'auto', background: theme.panel, color: theme.gold, border: '1px solid ' + theme.goldDark, borderRadius: 10, padding: '8px 20px', fontWeight: 600, cursor: 'pointer', boxShadow: theme.e1, fontSize: 13, flexShrink: 0 },
  bustImg: { position: 'absolute' as const, left: '2%', bottom: '0', width: 320, height: '66%', objectFit: 'contain', objectPosition: 'center bottom', zIndex: 3, filter: 'drop-shadow(0 12px 22px rgba(0,0,0,0.24))', pointerEvents: 'none', animation: 'fadeIn 400ms var(--ease)' },
  nameTag: { position: 'absolute' as const, left: '3%', bottom: '1.6%', zIndex: 9, background: 'rgba(20,20,22,0.52)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 8, padding: '5px 16px', fontSize: 14, color: '#fff', fontWeight: 700, letterSpacing: '0.08em', boxShadow: theme.e1 },
  montageOverlay: { position: 'absolute' as const, inset: 0, zIndex: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10%', background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.42) 100%)', pointerEvents: 'none' as const },
  montageLine: { color: '#fff', fontSize: 21, lineHeight: 2, letterSpacing: '0.1em', textAlign: 'center' as const, maxWidth: 860, textShadow: '0 2px 12px rgba(0,0,0,0.85)', fontFamily: 'var(--font-display)', animation: 'montageLineIn 700ms var(--ease) both' },
  stage: { position: 'absolute' as const, left: 0, right: 0, bottom: 0, padding: '0 24px 120px', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 },
  textBand: { position: 'absolute' as const, left: 0, right: 0, bottom: 0, zIndex: 8, background: 'linear-gradient(180deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.55) 40%, rgba(255,255,255,0.72) 100%)', padding: '28px 12% 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 126, cursor: 'pointer' },
  content: { fontSize: 18, lineHeight: 1.8, letterSpacing: '0.03em', color: theme.text, maxWidth: 980, textAlign: 'center' as const, textShadow: '0 1px 2px rgba(255,255,255,0.5)' },
  bracket: { color: theme.gold, fontWeight: 700, margin: '0 4px' },
  nextHint: { marginTop: 10, fontSize: 12, color: theme.textLight, letterSpacing: '0.08em', alignSelf: 'flex-end' },
  scenarioWrap: { width: '100%', maxWidth: 760, animation: 'rise 280ms var(--ease)' },
  scenario: { display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(255,255,255,0.9)', border: '1px solid ' + theme.border, borderRadius: 14, padding: 22, color: theme.text, boxShadow: theme.e2, backdropFilter: 'blur(8px)' },
  scenarioTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: theme.gold, marginBottom: 2 },
  choiceBtn: { display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(20,20,22,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 9, padding: '11px 20px', fontSize: 16, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(4px)' },
  choiceMark: { color: '#ffd54f', fontSize: 14, lineHeight: 1 },
  choiceBand: { position: 'absolute' as const, left: 0, right: 0, bottom: 0, zIndex: 8, background: 'linear-gradient(180deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.5) 40%, rgba(255,255,255,0.7) 100%)', padding: '22px 0 30px', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'flex-end', minHeight: 140 },
  optionBtn: { display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', color: theme.text, border: '1px solid rgba(255,255,255,0.65)', borderLeft: '3px solid ' + theme.gold, borderRadius: 10, padding: '14px 26px', fontSize: 17, fontWeight: 600, cursor: 'pointer', boxShadow: theme.e1, textAlign: 'left' as const, minWidth: 260 },
  optionTried: { opacity: 0.42, cursor: 'not-allowed', borderLeftColor: 'rgba(255,255,255,0.4)' },
  optionFailed: { opacity: 0.3, cursor: 'not-allowed', filter: 'grayscale(1)', background: 'rgba(20,20,22,0.55)', color: 'rgba(255,255,255,0.5)', borderLeftColor: 'rgba(20,20,22,0.6)' },
  triedNotice: { position: 'absolute' as const, top: '42%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,20,22,0.88)', color: '#fff', borderRadius: 12, padding: '12px 28px', fontSize: 15, boxShadow: theme.e2, zIndex: 9, animation: 'riseCenter 300ms var(--ease)', whiteSpace: 'nowrap' as const },
  optionMark: { color: theme.gold, fontSize: 15, lineHeight: 1 },
  choiceTask: { marginTop: 6, fontSize: 13, color: '#fff', background: 'rgba(20,20,22,0.45)', padding: '5px 14px', borderRadius: 6, letterSpacing: '0.06em', backdropFilter: 'blur(4px)' },
  task: { marginTop: 6, fontSize: 13, color: theme.textSoft },
  finished: { textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', background: 'rgba(251,247,241,0.95)', border: '1px solid ' + theme.border, padding: '42px 70px', borderRadius: 14, animation: 'rise 300ms var(--ease)', boxShadow: theme.e2 },
  finishedTitle: { fontFamily: 'var(--font-display)', fontSize: 22, color: theme.gold, letterSpacing: '0.16em' },
  btn: { background: theme.gold, color: theme.onGold, border: 'none', borderRadius: 10, padding: '10px 26px', fontWeight: 700, cursor: 'pointer', boxShadow: theme.e1 },
  ghost: { background: 'transparent', color: theme.textSoft, border: '1px solid ' + theme.border, borderRadius: 10, padding: '10px 26px', cursor: 'pointer', marginLeft: 10 },
  center: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: theme.text, background: theme.bg },
  devNote: { position: 'absolute' as const, bottom: 6, left: 12, fontSize: 11, color: theme.textLight, zIndex: 6 },
  transitionOverlay: { position: 'absolute' as const, inset: 0, zIndex: 30, pointerEvents: 'none', opacity: 0, visibility: 'hidden' as const },
  curtainTop: { position: 'absolute' as const, top: 0, left: 0, right: 0, height: '50%', background: '#000', transformOrigin: 'top' },
  curtainBottom: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: '50%', background: '#000', transformOrigin: 'bottom' },
  centerOverlay: { position: 'absolute' as const, inset: 0, zIndex: 28, background: 'rgba(10,10,12,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 300ms var(--ease)' },
  centerOverlayText: { color: '#fff', fontSize: 20, maxWidth: 720, textAlign: 'center', lineHeight: 1.9, letterSpacing: 0.06, fontFamily: 'var(--font-display)' },
  subtitleBeat: { position: 'absolute' as const, inset: 0, zIndex: 40, background: 'rgba(8,8,10,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, animation: 'fadeIn 440ms var(--ease)' },
  subtitleBeatText: { color: '#fff', fontSize: 20, maxWidth: 720, textAlign: 'center', lineHeight: 1.9, letterSpacing: 0.06, fontFamily: 'var(--font-display)' },
  subtitleNextHint: { marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em' },
  failOverlay: { position: 'absolute' as const, inset: 0, zIndex: 42, background: 'rgba(8,8,10,0.94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: '0 8%', cursor: 'pointer', animation: 'fadeIn 440ms var(--ease)' },
  failTitle: { fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.55)' },
  failText: { color: '#fff', fontSize: 20, maxWidth: 720, textAlign: 'center', lineHeight: 1.9, letterSpacing: 0.06, fontFamily: 'var(--font-display)', minHeight: 76 },
  failHint: { marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em' },
  hiddenCgOverlay: { position: 'absolute' as const, inset: 0, zIndex: 42, background: 'rgba(8,8,10,0.62)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: '0 10%', cursor: 'pointer', animation: 'fadeIn 600ms var(--ease)' },
  hiddenCgText: { color: '#fff', fontSize: 19, maxWidth: 760, textAlign: 'center', lineHeight: 2.1, letterSpacing: 0.05, fontFamily: 'var(--font-display)' },
  dateBanner: { position: 'absolute' as const, top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 26, background: 'rgba(10,10,12,0.72)', color: '#fff', borderRadius: 8, padding: '8px 22px', fontSize: 15, letterSpacing: '0.2em', fontFamily: 'var(--font-display)', boxShadow: theme.e1 },
  collectionToast: { position: 'absolute' as const, bottom: 200, left: '50%', transform: 'translateX(-50%)', zIndex: 26, background: 'rgba(166,30,46,0.94)', color: '#fff', borderRadius: 24, padding: '10px 24px', fontSize: 14, fontWeight: 600, boxShadow: theme.e2, animation: 'riseCenter 300ms var(--ease)' },
  collectionIcon: { marginRight: 6 },
  achvToast: {
    position: 'absolute' as const, top: 24, right: 24, zIndex: 27,
    background: '#fff', border: `1px solid ${theme.gold}`, borderRadius: 14,
    padding: '14px 18px 14px 14px', boxShadow: theme.e2,
    display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 260,
    animation: 'slideInRight 300ms var(--ease)',
  },
  achvIcon: { fontSize: 28, lineHeight: 1, flexShrink: 0 },
  achvLabel: { fontSize: 11, color: theme.gold, fontWeight: 700, letterSpacing: 0.6 },
  achvName: { fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, marginTop: 2 },
  achvDesc: { fontSize: 12, color: theme.textSoft, marginTop: 2, lineHeight: 1.4 },
  minigameOverlay: { position: 'fixed' as const, inset: 0, zIndex: 40, background: 'rgba(22,23,26,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' },
  minigameCard: { width: '90%', maxWidth: 440, background: theme.panel, borderRadius: 18, padding: 28, textAlign: 'center', boxShadow: theme.e3 },
  minigameTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 10 },
  minigameBody: { color: theme.textSoft, fontSize: 15, marginBottom: 8 },
  minigameHint: { color: theme.textLight, fontSize: 12, marginBottom: 18 },
  endingOverlay: { position: 'absolute' as const, inset: 0, zIndex: 36, background: 'rgba(22,16,8,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, animation: 'fadeIn 500ms var(--ease)', backdropFilter: 'blur(2px)' },  endingMark: { width: 64, height: 64, borderRadius: '50%', background: 'rgba(166,30,46,0.92)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 8px 24px rgba(166,30,46,0.4)', animation: 'rise 400ms var(--ease)' },
  endingTitle: { color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, letterSpacing: '0.3em', textShadow: '0 2px 12px rgba(0,0,0,0.4)' },
  endingSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, letterSpacing: '0.12em' },
  endingBtn: { marginTop: 14, background: theme.gold, color: theme.onGold, border: 'none', borderRadius: 12, padding: '12px 34px', fontWeight: 700, cursor: 'pointer', boxShadow: theme.e1 },
} as const
