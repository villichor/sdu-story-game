package edu.sdu.storygame.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import edu.sdu.storygame.context.UserContext;
import edu.sdu.storygame.data.dto.CreateGameSaveDTO;
import edu.sdu.storygame.data.dto.RewindStoryDTO;
import edu.sdu.storygame.data.dto.UpdateStoryPositionDTO;
import edu.sdu.storygame.data.dto.AdvanceStoryDTO;
import edu.sdu.storygame.data.enums.ResultCode;
import edu.sdu.storygame.data.enums.StoryInteractionType;
import edu.sdu.storygame.data.po.*;
import edu.sdu.storygame.data.vo.*;
import edu.sdu.storygame.exception.BusinessException;
import edu.sdu.storygame.mapper.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DuplicateKeyException;

import java.util.List;
import java.util.Objects;

/**
 * 游戏存档业务
 */
@Service
@RequiredArgsConstructor
public class GameSaveService {

    private final GameSaveMapper gameSaveMapper;
    private final SavePathMapper savePathMapper;
    private final ChapterMapper chapterMapper;
    private final StoryNodeMapper storyNodeMapper;
    private final StoryChoiceMapper storyChoiceMapper;
    private final StoryLineMapper storyLineMapper;
    private final AchievementService achievementService;


    /**
     * 创建指定人物故事的存档
     * 创建过程包括：
     * 1. 校验章节是否存在；
     * 2. 校验同一章节下的存档名是否重复；
     * 3. 查询该章节唯一的入口节点；
     * 4. 创建存档；
     * 5. 写入第一条有效路径记录。
     * 事务保证存档和初始路径必须同时创建成功
     *
     * @param dto 新建存档请求
     * @return 创建完成的存档信息
     */
    @Transactional
    public GameSaveVO createSave(CreateGameSaveDTO dto) {

        Long userId = UserContext.getUserIdRequired();
        String saveName = dto.saveName().trim();
        // 校验
        Chapter chapter = getChapter(dto.chapterId());
        checkSaveName(userId, chapter.getId(), saveName);
        // 拿到入口
        StoryNode entryNode = getEntryNode(chapter.getId());

        int initialCompletionRate = entryNode.getProgressPercent()==null ? 0:entryNode.getProgressPercent();

        GameSave gameSave = new GameSave();
        gameSave.setUserId(userId);
        gameSave.setSaveName(saveName);
        gameSave.setChapterId(chapter.getId());
        gameSave.setCurrentNodeId(entryNode.getId());
        gameSave.setCurrentLineIndex(0);
        gameSave.setCompletionRate(initialCompletionRate);

        try {
            gameSaveMapper.insert(gameSave);
        } catch (DuplicateKeyException exception) {// 处理并发请求
            throw new BusinessException(ResultCode.SAVE_NAME_CONFLICT);
        }

        SavePath initialPath = new SavePath();
        initialPath.setSaveId(gameSave.getId());
        initialPath.setChoiceId(null);
        initialPath.setNodeId(entryNode.getId());
        initialPath.setStepIndex(0);
        initialPath.setIsActive(true);

        savePathMapper.insert(initialPath);

        return toVO(gameSave, chapter, entryNode);
    }

    /**
     * 查询当前用户的存档列表
     * @param chapterId 章节 ID；为 null 时查询全部存档
     * @return 当前用户的存档列表
     */
    public List<GameSaveVO> listSaves(Long chapterId) {
        Long userId = UserContext.getUserIdRequired();

        if (chapterId != null) getChapter(chapterId);
        return gameSaveMapper.selectSaveList(userId, chapterId);
    }


    /**
     * 读取指定存档的当前剧情
     * @param saveId 存档 ID
     * @return 当前剧情状态
     */
    public CurrentStoryVO getCurrentStory(Long saveId) {
        Long userId = UserContext.getUserIdRequired();
        // 校验存档
        GameSave gameSave = getOwnedSave(saveId, userId);
        // 查询节点
        StoryNode currentNode = getCurrentNode(gameSave);
        // 查询可见台词
        List<StoryLine> storyLines = getVisibleStoryLines(saveId,currentNode.getId());
        List<StoryChoice> storyChoices = getStoryChoices(currentNode.getId());

        Integer currentLineIndex = gameSave.getCurrentLineIndex();
        validateCurrentLineIndex(currentLineIndex,storyLines.size());

        StoryInteractionType interactionType = determineInteractionType(
                currentNode,
                currentLineIndex,
                storyLines.size(),
                storyChoices
        );
        List<StoryLineVO> lineVOList = storyLines.stream().map(this::toStoryLineVO).toList();

        // 只有台词已经播放完并且当前节点确实需要选择时才向前端返回选项，避免前端在剧情尚未播放完成时提前显示选项
        List<StoryChoiceVO> choiceVOList = interactionType==StoryInteractionType.CHOICE ? storyChoices.stream().map(this::toStoryChoiceVO).toList():List.of();

        StoryNodeVO nodeVO = new StoryNodeVO(
                currentNode.getId(),
                currentNode.getNodeCode(),
                currentNode.getNodeType(),
                currentNode.getTitle(),
                currentNode.getBackgroundRef(),
                currentNode.getCgRef(),
                lineVOList,
                choiceVOList
        );

        return new CurrentStoryVO(
                gameSave.getId(),
                gameSave.getChapterId(),
                currentLineIndex,
                gameSave.getCompletionRate(),
                interactionType,
                nodeVO
        );
    }

    /**
     * 更新当前存档的台词播放位置 一次只允许向前推进一句台词
     * @param saveId 存档 ID
     * @param dto    位置更新请求
     * @return 更新后的剧情交互状态
     */
    @Transactional
    public StoryPositionVO updatePosition(Long saveId, UpdateStoryPositionDTO dto) {
        Long userId = UserContext.getUserIdRequired();

        GameSave gameSave = getOwnedSave(saveId,userId);
        StoryNode currentNode = getCurrentNode(gameSave);

        // 校验
        // 是否重复请求/来自旧页面
        if(!Objects.equals(currentNode.getId(),dto.expectedNodeId()))
            throw new BusinessException(ResultCode.STORY_STATE_CONFLICT);
        if(!Objects.equals(gameSave.getCurrentLineIndex(),dto.expectedLineIndex()))
            throw new BusinessException(ResultCode.STORY_STATE_CONFLICT);

        // 每次播放保存一句台词
        if ((long) dto.targetLineIndex() != (long) dto.expectedLineIndex()+1)
            throw new BusinessException(ResultCode.LINE_INDEX_INVALID);

//        long lineCount = storyLineMapper.selectCount(Wrappers.<StoryLine>lambdaQuery().eq(StoryLine::getNodeId,currentNode.getId()));
        List<StoryLine> visibleLines = getVisibleStoryLines(saveId,currentNode.getId());
        int lineCount = visibleLines.size();
        if (dto.targetLineIndex()>lineCount)
            throw new BusinessException(ResultCode.LINE_INDEX_INVALID);

        // 条件更新保证并发安全
        int affectedRows = gameSaveMapper.update(
                null,
                Wrappers.<GameSave>lambdaUpdate()
                        .eq(GameSave::getId, saveId)
                        .eq(GameSave::getUserId, userId)
                        .eq(GameSave::getCurrentNodeId, dto.expectedNodeId())
                        .eq(GameSave::getCurrentLineIndex, dto.expectedLineIndex())
                        .set(GameSave::getCurrentLineIndex, dto.targetLineIndex())
        );

        if (affectedRows != 1)
            throw new BusinessException(ResultCode.STORY_STATE_CONFLICT);

        // 播放完最后一句后读取选项并判断下一步交互状态
        List<StoryChoice> storyChoices = dto.targetLineIndex()==lineCount ? getStoryChoices(currentNode.getId()):List.of();
        StoryInteractionType interactionType = determineInteractionType(
                        currentNode,
                        dto.targetLineIndex(),
                        lineCount,
                        storyChoices
                );

        // 弹出成就
        List<AchievementUnlockVO> unlockedAchievements = dto.targetLineIndex()==lineCount
                        ? achievementService.unlockByCompletedNode(userId,currentNode.getId()):List.of();

        List<StoryChoiceVO> choiceVOList = interactionType==StoryInteractionType.CHOICE
                ? storyChoices.stream().map(this::toStoryChoiceVO).toList():List.of();

        return new StoryPositionVO(
                gameSave.getId(),
                currentNode.getId(),
                dto.targetLineIndex(),
                interactionType,
                choiceVOList,
                unlockedAchievements
        );
    }

    /**
     * 推进到下一个剧情节点（该接口统一处理无选项节点的线性推进和存在选项节点的选择推进）
     * 1. 更新 game_save 当前节点；
     * 2. 将台词位置重置为 0；
     * 3. 更新完成度；
     * 4. 向 save_path 写入新的有效路径记录。
     * 事务保证更新存档和写入路径必须同时成功
     *
     * @param saveId 存档 ID
     * @param dto    推进请求
     * @return 推进后的完整剧情状态
     */
    @Transactional
    public CurrentStoryVO advanceStory(Long saveId,AdvanceStoryDTO dto) {
        Long userId = UserContext.getUserIdRequired();

        GameSave gameSave = getOwnedSave(saveId,userId);
        StoryNode currentNode = getCurrentNode(gameSave);


        // 校验客户端提交的节点必须与数据库中的当前节点一致
        if (!Objects.equals(currentNode.getId(),dto.expectedNodeId()))
            throw new BusinessException(ResultCode.STORY_STATE_CONFLICT);


        // 校验客户端提交的台词位置必须与数据库中一致
        if (!Objects.equals(gameSave.getCurrentLineIndex(),dto.expectedLineIndex()))
            throw new BusinessException(ResultCode.STORY_STATE_CONFLICT);


        List<StoryLine> visibleLines = getVisibleStoryLines(saveId,currentNode.getId());
        int lineCount = visibleLines.size();

        validateCurrentLineIndex(gameSave.getCurrentLineIndex(),lineCount);

        List<StoryChoice> storyChoices = getStoryChoices(currentNode.getId());

        StoryInteractionType interactionType = determineInteractionType(
                        currentNode,
                        gameSave.getCurrentLineIndex(),
                        lineCount,
                        storyChoices
                );

        // 台词尚未播放完时禁止推进节点
        if (interactionType == StoryInteractionType.PLAYING)
            throw new BusinessException(ResultCode.LINE_INDEX_INVALID);

        // 故事结束处理
        if (interactionType == StoryInteractionType.FINISHED)
            throw new BusinessException(ResultCode.CHAPTER_FINISHED);

        Long targetNodeId;
        Long selectedChoiceId = null;

        // 两种节点 线性/选择
        if (interactionType == StoryInteractionType.LINEAR) {
            if (dto.choiceId()!=null)
                throw new BusinessException(ResultCode.CHOICE_NOT_ALLOWED);

            targetNodeId = currentNode.getNextNodeId();
        } else{
            if (dto.choiceId() == null)
                throw new BusinessException(ResultCode.CHOICE_REQUIRED);

            StoryChoice selectedChoice = getSelectedChoice(storyChoices, dto.choiceId());

            targetNodeId = selectedChoice.getToNodeId();
            selectedChoiceId = selectedChoice.getId();
        }
        StoryNode targetNode = getTargetNode(targetNodeId, gameSave.getChapterId());

        int targetCompletionRate = getNodeCompletionRate(targetNode);


        // 查询当前有效路径的最后一步
        SavePath currentPath = getCurrentActivePath(gameSave);

        int affectedRows = gameSaveMapper.update(null,
                Wrappers.<GameSave>lambdaUpdate()
                        .eq(GameSave::getId,saveId)
                        .eq(GameSave::getUserId,userId)
                        .eq(GameSave::getCurrentNodeId,dto.expectedNodeId())
                        .eq(GameSave::getCurrentLineIndex,dto.expectedLineIndex())
                        .set(GameSave::getCurrentNodeId,targetNode.getId())
                        .set(GameSave::getCurrentLineIndex,0)
                        .set(GameSave::getCompletionRate,targetCompletionRate)
        );

        // 受影响行数为0说明出现重复请求或并发状态变化。

        if(affectedRows != 1)
            throw new BusinessException(ResultCode.STORY_STATE_CONFLICT);

        SavePath newPath = new SavePath();
        newPath.setSaveId(gameSave.getId());
        newPath.setChoiceId(selectedChoiceId);
        newPath.setNodeId(targetNode.getId());
        newPath.setStepIndex(currentPath.getStepIndex() + 1);
        newPath.setIsActive(true);

        int insertedRows = savePathMapper.insert(newPath);

        if (insertedRows != 1)
            throw new BusinessException(ResultCode.ERROR);

        return getCurrentStory(saveId);
    }


    /**
     * 查询当前存档实际走过的有效剧情路径
     *
     * @param saveId 存档 ID
     * @return 当前有效剧情路径
     */
    public StoryPathVO getStoryPath(Long saveId) {
        Long userId = UserContext.getUserIdRequired();

        GameSave gameSave = getOwnedSave(saveId, userId);
        SavePath currentPath = getCurrentActivePath(gameSave);

        List<StoryPathNodeVO> nodes = savePathMapper.selectStoryPathNodes(gameSave.getId(),currentPath.getId());

        return new StoryPathVO(
                gameSave.getId(),
                gameSave.getChapterId(),
                currentPath.getId(),
                gameSave.getCurrentNodeId(),
                nodes
        );
    }

    /**
     * 回溯到当前有效路径中的某个历史节点
     * 1. 目标节点之后的旧路径设置为 is_active = 0；
     * 2. game_save 回到目标节点；
     * 3. current_line_index 重置为 0；
     * 4. 完成度恢复为目标节点的 progress_percent
     * 5. 旧路径记录不会被删除
     *
     * @param saveId 存档 ID
     * @param dto    回溯请求
     * @return 回溯后的当前剧情
     */
    @Transactional
    public CurrentStoryVO rewindStory(
            Long saveId,
            RewindStoryDTO dto
    ) {
        Long userId = UserContext.getUserIdRequired();

        // 查询，锁定当前存档
        GameSave gameSave = getOwnedSaveForUpdate(saveId, userId);
        SavePath currentPath = getCurrentActivePath(gameSave);


        // 校验重复请求（故事线过期）
        if (!Objects.equals(currentPath.getId(),dto.expectedCurrentPathId()))
            throw new BusinessException(ResultCode.STORY_STATE_CONFLICT);

        SavePath targetPath = getActiveRewindTarget(gameSave.getId(), dto.targetPathId());

        // 只能回溯到当前步骤之前
        if (targetPath.getStepIndex()>=currentPath.getStepIndex())
            throw new BusinessException(ResultCode.REWIND_NOT_ALLOWED);

        StoryNode targetNode = getTargetNode(targetPath.getNodeId(),gameSave.getChapterId());

        if (!Boolean.TRUE.equals(targetNode.getShowInStoryline()))
            throw new BusinessException(ResultCode.REWIND_NOT_ALLOWED);

        int targetCompletionRate = getNodeCompletionRate(targetNode);

        // 将目标步骤之后的旧路径全部置为无效，不删除旧路径保留玩家曾经走过的历史分支
        int deactivatedRows = savePathMapper.update(null,
                Wrappers.<SavePath>lambdaUpdate()
                        .eq(SavePath::getSaveId,gameSave.getId())
                        .eq(SavePath::getIsActive,true)
                        .gt(SavePath::getStepIndex,targetPath.getStepIndex())
                        .set(SavePath::getIsActive,false)
        );

        if (deactivatedRows < 1)
            throw new BusinessException(ResultCode.STORY_STATE_CONFLICT);

        int updatedRows = gameSaveMapper.update(
                null,
                Wrappers.<GameSave>lambdaUpdate()
                        .eq(GameSave::getId,gameSave.getId())
                        .eq(GameSave::getUserId,userId)
                        .eq(GameSave::getCurrentNodeId,gameSave.getCurrentNodeId())
                        .eq(GameSave::getCurrentLineIndex,gameSave.getCurrentLineIndex())
                        .set(GameSave::getCurrentNodeId,targetNode.getId())
                        .set(GameSave::getCurrentLineIndex,0)
                        .set(GameSave::getCompletionRate,targetCompletionRate)
        );

        if (updatedRows != 1)
            throw new BusinessException(ResultCode.STORY_STATE_CONFLICT);

        return getCurrentStory(saveId);
    }

    /**
     * 删除当前用户拥有的存档
     * @param saveId 存档 ID
     */
    public void deleteSave(Long saveId) {
        Long userId = UserContext.getUserIdRequired();

        int deletedRows = gameSaveMapper.delete(
                Wrappers.<GameSave>lambdaQuery()
                        .eq(GameSave::getId,saveId)
                        .eq(GameSave::getUserId,userId));

        if (deletedRows != 1)
            throw new BusinessException(ResultCode.SAVE_NOT_FOUND);
    }


    /**
     * 查询并校验，获取玩家选择的章节
     */
    private Chapter getChapter(Long chapterId) {
        Chapter chapter = chapterMapper.selectById(chapterId);

        if (chapter == null)
            throw new BusinessException(ResultCode.CHAPTER_NOT_FOUND);
        return chapter;
    }

    /**
     * 校验同一用户在同一人物故事下是否已经存在同名存档
     */
    private void checkSaveName(Long userId, Long chapterId, String saveName) {
        boolean exists = gameSaveMapper.exists(
                Wrappers.<GameSave>lambdaQuery()
                        .eq(GameSave::getUserId, userId)
                        .eq(GameSave::getChapterId, chapterId)
                        .eq(GameSave::getSaveName, saveName)
        );

        if (exists)
            throw new BusinessException(ResultCode.SAVE_NAME_CONFLICT);
    }

    /**
     * 查询章节入口节点
     */
    private StoryNode getEntryNode(Long chapterId) {
        List<StoryNode> entryNodes = storyNodeMapper.selectList(
                Wrappers.<StoryNode>lambdaQuery()
                        .eq(StoryNode::getChapterId, chapterId)
                        .eq(StoryNode::getIsEntry, true)
                        .orderByAsc(StoryNode::getId)
        );
        if (entryNodes.size() != 1)
            throw new BusinessException(ResultCode.STORY_CONFIG_ERROR);

        return entryNodes.getFirst();
    }

    /**
     * 转换存档实体 -> VO
     */
    private GameSaveVO toVO(GameSave gameSave, Chapter chapter, StoryNode node) {
        return new GameSaveVO(
                gameSave.getId(),
                gameSave.getSaveName(),
                chapter.getId(),
                chapter.getTitle(),
                chapter.getCharacter(),
                node.getId(),
                node.getTitle(),
                gameSave.getCurrentLineIndex(),
                gameSave.getCompletionRate(),
                gameSave.getCreatedAt(),
                gameSave.getUpdatedAt()
        );
    }


    /**
     * 查询当前用户拥有的指定存档
     * 如果存档不存在或属于其他用户，统一返回 SAVE_NOT_FOUND
     * @param saveId 存档 ID
     * @param userId 当前用户 ID
     * @return 当前用户拥有的存档
     */
    private GameSave getOwnedSave(Long saveId, Long userId) {
        GameSave gameSave = gameSaveMapper.selectOne(
                Wrappers.<GameSave>lambdaQuery()
                        .eq(GameSave::getId, saveId)
                        .eq(GameSave::getUserId, userId)
        );

        if (gameSave == null) {
            throw new BusinessException(
                    ResultCode.SAVE_NOT_FOUND
            );
        }

        return gameSave;
    }



    /**
     * 查询存档当前所在节点
     * 除了检查节点是否存在还检查节点是否属于存档绑定的章节，防止错误数据导致存档跳入其他人物故事
     * @param gameSave 当前存档
     * @return 当前剧情节点
     */
    private StoryNode getCurrentNode(GameSave gameSave) {
        StoryNode currentNode = storyNodeMapper.selectById(
                gameSave.getCurrentNodeId()
        );

        if (currentNode == null)
            throw new BusinessException(ResultCode.STORY_CONFIG_ERROR);
        if (!Objects.equals(currentNode.getChapterId(), gameSave.getChapterId()))
            throw new BusinessException(ResultCode.STORY_CONFIG_ERROR);

        return currentNode;
    }


    /**
     * 校验存档中的台词位置是否合法
     * @param currentLineIndex 当前台词位置（下一句待播放台词的数组下标）
     * @param lineCount        当前节点台词总数
     */
    private void validateCurrentLineIndex(Integer currentLineIndex, int lineCount) {
        if (currentLineIndex==null || currentLineIndex<0 || currentLineIndex>lineCount)
            throw new BusinessException(ResultCode.STORY_STATE_CONFLICT);
    }


    /**
     * 用于判断前端当前应该执行哪种交互 同时检查互相冲突的剧情配置
     * 1. 台词没有播放完：playing；
     * 2. 台词播放完并存在选项：choice；
     * 3. 台词播放完、没有选项但存在 nextNodeId：linear；
     * 4. chapter_end 没有任何后继：finished。
     *
     * @param node             当前节点
     * @param currentLineIndex 当前台词位置
     * @param lineCount        当前节点台词总数
     * @param choices          当前节点的选项
     * @return 当前交互类型
     */
    private StoryInteractionType determineInteractionType(StoryNode node,int currentLineIndex,int lineCount,List<StoryChoice> choices) {
        if (currentLineIndex < lineCount)
            return StoryInteractionType.PLAYING;

        boolean hasChoices = !choices.isEmpty();
        boolean hasNextNode = node.getNextNodeId() != null;
        boolean chapterEnd =
                "chapter_end".equals(node.getNodeType());

        // 节点不能同时配置线性后继和玩家选项
        if (hasChoices && hasNextNode)
            throw new BusinessException(ResultCode.STORY_CONFIG_ERROR);


        /*
         * 真正的章节终点不能再配置任何后继
         */
        if (chapterEnd && (hasChoices||hasNextNode))
            throw new BusinessException(ResultCode.STORY_CONFIG_ERROR);
        if (hasChoices)
            return StoryInteractionType.CHOICE;
        if (hasNextNode)
            return StoryInteractionType.LINEAR;
        if (chapterEnd)
            return StoryInteractionType.FINISHED;

        // 普通节点既没有next_node_id，也没有选项，说明剧情图出现了断点。
        throw new BusinessException(ResultCode.STORY_CONFIG_ERROR);
    }


    /**
     * 转换剧情台词
     */
    private StoryLineVO toStoryLineVO(StoryLine storyLine) {
        return new StoryLineVO(
                storyLine.getId(),
                storyLine.getLineType(),
                storyLine.getSpeaker(),
                storyLine.getContent(),
                storyLine.getPortraitRef(),
                storyLine.getEffectRef(),
                storyLine.getOrderIndex()
        );
    }

    /**
     * 转换剧情选项
     * 不返回 toNodeId，避免前端获得实际跳转目标
     */
    private StoryChoiceVO toStoryChoiceVO(StoryChoice storyChoice) {
        return new StoryChoiceVO(
                storyChoice.getId(),
                storyChoice.getChoiceCode(),
                storyChoice.getChoiceText(),
                storyChoice.getOrderIndex()
        );
    }

    /**
     * 查看节点下的全部选项
     */
    private List<StoryChoice> getStoryChoices(Long nodeId) {
        return storyChoiceMapper.selectList(
                Wrappers.<StoryChoice>lambdaQuery()
                        .eq(
                                StoryChoice::getFromNodeId,
                                nodeId
                        )
                        .orderByAsc(StoryChoice::getOrderIndex)
                        .orderByAsc(StoryChoice::getId)
        );
    }

    /**
     * 从当前节点的选项中查找得到玩家提交的选项
     *
     * @param storyChoices 当前节点的全部选项
     * @param choiceId     玩家提交的选项 ID
     * @return 当前节点所包含的合法选项
     */
    private StoryChoice getSelectedChoice(List<StoryChoice> storyChoices, Long choiceId) {
        return storyChoices.stream().filter(choice -> Objects.equals(choice.getId(), choiceId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ResultCode.CHOICE_NOT_ALLOWED));
    }

    /**
     * 查询并校验剧情推进的目标节点
     * @param nodeId    目标节点 ID
     * @param chapterId 存档所属章节 ID
     * @return 合法的目标节点
     */
    private StoryNode getTargetNode(Long nodeId,Long chapterId) {
        StoryNode targetNode = storyNodeMapper.selectById(nodeId);

        if (targetNode == null)
            throw new BusinessException(ResultCode.STORY_CONFIG_ERROR);

        if (!Objects.equals(targetNode.getChapterId(),chapterId))
            throw new BusinessException(ResultCode.STORY_CONFIG_ERROR);

        return targetNode;
    }


    /**
     * 获取并校验目标节点对应的完成度
     * @param node 目标节点
     * @return 合法完成度
     */
    private int getNodeCompletionRate(StoryNode node) {
        Integer completionRate = node.getProgressPercent();
        if (completionRate==null || completionRate<0 || completionRate>100)
            throw new BusinessException(ResultCode.STORY_CONFIG_ERROR);

        return completionRate;
    }

    /**
     * 查询存档当前有效路径的最后一步
     * 回溯后，旧分支会被设置为 is_active = 0，这里只查询仍然有效的路径
     * 最后一步记录的节点必须保证与 game_save.current_node_id 一致
     * @param gameSave 当前存档
     * @return 当前有效路径的最后一步
     */
    private SavePath getCurrentActivePath(GameSave gameSave) {
        SavePath currentPath = savePathMapper.selectOne(
                Wrappers.<SavePath>lambdaQuery()
                        .eq(SavePath::getSaveId,gameSave.getId())
                        .eq(SavePath::getIsActive, true)
                        .orderByDesc(SavePath::getStepIndex)
                        .orderByDesc(SavePath::getId)
                        .last("LIMIT 1")
        );

        if (currentPath == null)
            throw new BusinessException(ResultCode.STORY_CONFIG_ERROR);

        if (!Objects.equals(currentPath.getNodeId(),gameSave.getCurrentNodeId()))
            throw new BusinessException(ResultCode.STORY_STATE_CONFLICT);

        return currentPath;
    }

    /**
     * 查询并锁定当前用户拥有的存档
     * FOR UPDATE阻止同一个存档同时执行多个回溯操作，在事务中调用
     * @param saveId 存档 ID
     * @param userId 当前用户 ID
     * @return 已锁定的存档
     */
    private GameSave getOwnedSaveForUpdate(Long saveId,Long userId) {
        GameSave gameSave = gameSaveMapper.selectOne(
                Wrappers.<GameSave>lambdaQuery()
                        .eq(GameSave::getId, saveId)
                        .eq(GameSave::getUserId, userId)
                        .last("FOR UPDATE")
        );

        if (gameSave==null)
            throw new BusinessException(ResultCode.SAVE_NOT_FOUND);

        return gameSave;
    }

    /**
     * 查询获取当前有效路径中的目标回溯路径
     * @param saveId       存档 ID
     * @param targetPathId 目标路径记录 ID
     * @return 有效路径记录
     */
    private SavePath getActiveRewindTarget(Long saveId,Long targetPathId) {
        SavePath targetPath = savePathMapper.selectOne(
                Wrappers.<SavePath>lambdaQuery()
                        .eq(SavePath::getId,targetPathId)
                        .eq(SavePath::getSaveId,saveId)
                        .eq(SavePath::getIsActive,true)
        );

        if (targetPath == null)
            throw new BusinessException(ResultCode.REWIND_NOT_ALLOWED);

        return targetPath;
    }

    /**
     * 查询指定节点内实际可见的台词（处理条件台词）
     * @param saveId 存档 ID
     * @param nodeId 节点 ID
     * @return 当前存档可见的台词
     */
    private List<StoryLine> getVisibleStoryLines(Long saveId,Long nodeId) {
        return storyLineMapper.selectVisibleLines(saveId,nodeId);
    }



}

