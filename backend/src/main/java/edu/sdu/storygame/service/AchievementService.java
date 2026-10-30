package edu.sdu.storygame.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import edu.sdu.storygame.context.UserContext;
import edu.sdu.storygame.data.enums.ResultCode;
import edu.sdu.storygame.data.po.Achievement;
import edu.sdu.storygame.data.vo.AchievementUnlockVO;
import edu.sdu.storygame.data.vo.AchievementVO;
import edu.sdu.storygame.exception.BusinessException;
import edu.sdu.storygame.mapper.AchievementMapper;
import edu.sdu.storygame.mapper.ChapterMapper;
import edu.sdu.storygame.mapper.UserAchievementMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;

/**
 * 成就业务
 */
@Service
@RequiredArgsConstructor
public class AchievementService {

    private final AchievementMapper achievementMapper;
    private final UserAchievementMapper userAchievementMapper;
    private final ChapterMapper chapterMapper;

    /**
     * 查询当前用户的成就列表
     * chapterId 不传时查询全部成就；
     * chapterId 传入时只查询指定人物故事的成就。
     * @param chapterId 可选章节ID
     * @return 成就列表
     */
    public List<AchievementVO> listAchievements(Long chapterId) {
        Long userId = UserContext.getUserIdRequired();

        if (chapterId != null && chapterMapper.selectById(chapterId)==null)
            throw new BusinessException(ResultCode.CHAPTER_NOT_FOUND);

        return achievementMapper.selectAchievementList(userId,chapterId);
    }

    /**
     * 解锁由指定剧情节点触发的成就，已经解锁过的成就不重复返回
     * @param userId 用户ID
     * @param nodeId 已经完成的剧情节点ID
     * @return 本次触发的成就VO
     */
    @Transactional
    public List<AchievementUnlockVO> unlockByCompletedNode(Long userId,Long nodeId) {
        List<Achievement> achievements = achievementMapper.selectList(
                        Wrappers.<Achievement>lambdaQuery()
                                .eq(Achievement::getTriggerNodeId,nodeId)
                                .orderByAsc(Achievement::getId)
                );
        if (achievements.isEmpty()) return List.of();

        List<AchievementUnlockVO> unlockedAchievements = new ArrayList<>();
        for (Achievement achievement:achievements) {
            int insertedRows = userAchievementMapper.insertIgnore(userId,achievement.getId());


            // insertedRows = 1表示本次首次解锁，insertedRows = 0表示之前已经解锁
            if (insertedRows == 1)
                unlockedAchievements.add(toUnlockVO(achievement));
        }

        return List.copyOf(unlockedAchievements);
    }

    private AchievementUnlockVO toUnlockVO(Achievement achievement) {
        return new AchievementUnlockVO(
                achievement.getId(),
                achievement.getName(),
                achievement.getDescription(),
                achievement.getIcon(),
                achievement.getType(),
                achievement.getSouvenir()
        );
    }
}