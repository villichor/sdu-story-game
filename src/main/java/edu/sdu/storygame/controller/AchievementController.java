package edu.sdu.storygame.controller;

import edu.sdu.storygame.data.vo.Result;
import edu.sdu.storygame.data.vo.AchievementVO;
import edu.sdu.storygame.service.AchievementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 成就接口
 */
@RestController
@RequestMapping("/api/achievements")
@RequiredArgsConstructor
public class AchievementController {

    private final AchievementService achievementService;

    /**
     * 查询当前用户的成就列表
     * @param chapterId 可选章节ID，不传代表全部成就
     * @return 成就列表
     */
    @GetMapping
    public Result<List<AchievementVO>> listAchievements(@RequestParam(required = false) Long chapterId) {
        return Result.success(achievementService.listAchievements(chapterId));
    }
}