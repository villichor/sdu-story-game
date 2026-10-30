package edu.sdu.storygame.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import edu.sdu.storygame.data.po.Chapter;
import edu.sdu.storygame.data.vo.ChapterVO;
import edu.sdu.storygame.mapper.ChapterMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChapterService {
    private final ChapterMapper chapterMapper;

    public List<ChapterVO> listChapters(){
        List<Chapter> chapters = chapterMapper.selectList(
                Wrappers.<Chapter>lambdaQuery()
                        .orderByAsc(Chapter::getOrderIndex)
                        .orderByAsc(Chapter::getId)
        );
        return chapters.stream().map(this::toVO).toList();
    }

    private ChapterVO toVO(Chapter chapter){
        return new ChapterVO(
                chapter.getId(),
                chapter.getTitle(),
                chapter.getTheme(),
                chapter.getCharacter(),
                chapter.getOrderIndex()
        );
    }
}
