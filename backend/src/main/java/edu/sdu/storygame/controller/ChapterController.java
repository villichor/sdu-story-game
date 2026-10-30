package edu.sdu.storygame.controller;

import edu.sdu.storygame.data.vo.ChapterVO;
import edu.sdu.storygame.data.vo.Result;
import edu.sdu.storygame.service.ChapterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/chapters")
@RequiredArgsConstructor
public class ChapterController {
    private final ChapterService chapterService;

    @GetMapping
    public Result<List<ChapterVO>> listChapters() {
        return Result.success(chapterService.listChapters());
    }
}
