package edu.sdu.storygame.controller;


import edu.sdu.storygame.data.dto.AdvanceStoryDTO;
import edu.sdu.storygame.data.dto.CreateGameSaveDTO;
import edu.sdu.storygame.data.dto.RewindStoryDTO;
import edu.sdu.storygame.data.dto.UpdateStoryPositionDTO;
import edu.sdu.storygame.data.vo.*;
import edu.sdu.storygame.service.GameSaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 游戏存档接口
 */
@RestController
@RequestMapping("/api/saves")
@RequiredArgsConstructor
public class GameSaveController {

    private final GameSaveService gameSaveService;

    /**
     * 新建存档
     */
    @PostMapping
    public Result<GameSaveVO> createSave(
            @RequestBody @Valid CreateGameSaveDTO dto
    ) {
        return Result.success(gameSaveService.createSave(dto));
    }

    /**
     * 查询当前用户的存档列表
     * @param chapterId 可选章节 ID；不传时查询全部存档
     * @return 当前用户拥有的存档
     */
    @GetMapping
    public Result<List<GameSaveVO>> listSaves(
            @RequestParam(required = false) Long chapterId
    ) {
        return Result.success(
                gameSaveService.listSaves(chapterId)
        );
    }

    /**
     * 获取指定存档的当前剧情状态
     * @param saveId 存档 ID
     * @return 当前节点、台词、选项和交互状态
     */
    @GetMapping("/{saveId}/current")
    public Result<CurrentStoryVO> getCurrentStory(
            @PathVariable Long saveId
    ) {
        return Result.success(gameSaveService.getCurrentStory(saveId));
    }

    /**
     * 保存玩家播放完一句台词后的位置
     *
     * @param saveId 存档 ID
     * @param dto    位置更新请求
     * @return 更新后的剧情交互状态
     */
    @PatchMapping("/{saveId}/position")
    public Result<StoryPositionVO> updatePosition(@PathVariable Long saveId,
            @Valid @RequestBody UpdateStoryPositionDTO dto
    ) {
        return Result.success(gameSaveService.updatePosition(saveId, dto));
    }

    /**
     * 推进到下一个剧情节点，返回新节点，统一处理线性推进和选择推进
     *
     * @param saveId 存档 ID
     * @param dto    推进请求
     * @return 推进后的完整剧情状态
     */
    @PostMapping("/{saveId}/advance")
    public Result<CurrentStoryVO> advanceStory(@PathVariable Long saveId,@Valid @RequestBody AdvanceStoryDTO dto) {
        return Result.success(gameSaveService.advanceStory(saveId, dto));
    }

    /**
     * 查询当前存档有效剧情路径
     * @param saveId 存档 ID
     * @return 当前剧情路径
     */
    @GetMapping("/{saveId}/storyline")
    public Result<StoryPathVO> getStoryPath(@PathVariable Long saveId){
        return Result.success(gameSaveService.getStoryPath(saveId));
    }

    /**
     * 回溯到故事路径中的某个节点
     * @param saveId 存档 ID
     * @param dto    回溯请求
     * @return 回溯后的当前剧情
     */
    @PostMapping("/{saveId}/rewind")
    public Result<CurrentStoryVO> rewindStory(@PathVariable Long saveId,@Valid @RequestBody RewindStoryDTO dto) {
        return Result.success(gameSaveService.rewindStory(saveId,dto));
    }

    /**
     * 删除存档
     * @param saveId 存档 ID
     * @return 空数据
     */
    @DeleteMapping("/{saveId}")
    public Result<Void> deleteSave(@PathVariable Long saveId) {
        gameSaveService.deleteSave(saveId);
        return Result.success(null);
    }
}