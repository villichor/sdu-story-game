package edu.sdu.storygame.importer;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * story-import Profile 的命令行参数
 */
@Data
@Component
@Profile("story-import")
@ConfigurationProperties(prefix = "story.import")
public class StoryImportProperties {

    /**
     * 支持 classpath: 和 file: 两种 Spring Resource 地址
     */
    private String location = "classpath:story/pan-chengdong-story.json";

    /**
     * CREATE_ONLY：同编码章节已存在时拒绝导入。
     * REPLACE：只允许替换尚未产生任何存档的章节。
     */
    private ImportMode mode = ImportMode.CREATE_ONLY;

    public enum ImportMode {
        CREATE_ONLY,
        REPLACE
    }
}
