-- 用于已经按旧版 schema.sql 建过库的本地数据库。
-- 新建数据库时直接执行最新版 schema.sql，不需要执行本文件。
-- 脚本会检查列和索引是否已存在，因此可以处理“部分字段曾手动添加”的情况。

USE sdu_story_game;

DELIMITER //

DROP PROCEDURE IF EXISTS migrate_story_import //

CREATE PROCEDURE migrate_story_import()
BEGIN
    -- 1. 为章节补充稳定业务编码。
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'chapter'
          AND column_name = 'chapter_code'
    ) THEN
        ALTER TABLE chapter
            ADD COLUMN chapter_code VARCHAR(64) NULL
                COMMENT '稳定业务标识，如 PAN_CHENGDONG'
                AFTER id;
    END IF;

    UPDATE chapter
    SET chapter_code = 'pan_chengdong'
    WHERE chapter_code IS NULL
      AND title LIKE '潘承洞%';

    UPDATE chapter
    SET chapter_code = CONCAT('legacy_chapter_', id)
    WHERE chapter_code IS NULL;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'chapter'
          AND column_name = 'chapter_code'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE chapter
            MODIFY COLUMN chapter_code VARCHAR(64) NOT NULL
                COMMENT '稳定业务标识，如 PAN_CHENGDONG';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'chapter'
          AND index_name = 'uk_chapter_code'
    ) THEN
        ALTER TABLE chapter
            ADD UNIQUE KEY uk_chapter_code (chapter_code);
    END IF;

    -- 2. 补齐条件台词字段。StoryLine PO 与 StoryLineMapper.xml 已使用该列。
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'story_line'
          AND column_name = 'required_choice_code'
    ) THEN
        ALTER TABLE story_line
            ADD COLUMN required_choice_code VARCHAR(64) NULL
                COMMENT '条件台词依赖的选择编码；NULL表示始终可见'
                AFTER effect_ref;
    END IF;

    -- 3. 让并发下的同名存档校验真正落到数据库。
    -- 如果本段因历史重复数据失败，先执行文末查询并清理重复项。
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'game_save'
          AND index_name = 'uk_save_user_chapter_name'
    ) THEN
        ALTER TABLE game_save
            ADD UNIQUE KEY uk_save_user_chapter_name
                (user_id, chapter_id, save_name);
    END IF;
END //

CALL migrate_story_import() //
DROP PROCEDURE migrate_story_import //

DELIMITER ;

-- 若唯一索引创建失败，用下面的查询定位历史重复数据：
-- SELECT user_id, chapter_id, save_name, COUNT(*)
-- FROM game_save
-- GROUP BY user_id, chapter_id, save_name
-- HAVING COUNT(*) > 1;
