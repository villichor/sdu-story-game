-- =============================================================
-- 山大人文故事剧情向游戏 —— 后端数据库建表脚本
-- DB: MySQL 8.0 / InnoDB / utf8mb4
-- 主键统一 BIGINT AUTO_INCREMENT
-- =============================================================

CREATE DATABASE IF NOT EXISTS sdu_story_game
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE sdu_story_game;

-- =============================================================
-- 模块一：用户
-- =============================================================

CREATE TABLE `user` (
                        `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户主键',

                        `username` VARCHAR(64) NOT NULL
                            COMMENT '用户名或昵称，如“游客001”',

                        `is_guest` TINYINT(1) NOT NULL DEFAULT 1
      COMMENT '是否游客：1游客，0统一认证用户',

                        `student_id` VARCHAR(32) DEFAULT NULL
                            COMMENT '统一认证学号，游客为NULL',

                        `avatar_url` VARCHAR(255) DEFAULT NULL
                            COMMENT '头像地址',

                        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,

                        PRIMARY KEY (`id`),
                        UNIQUE KEY `uk_user_student_id` (`student_id`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='用户表';
-- =============================================================
-- 模块二：剧情存档系统
-- --- 内容侧（章节 / 节点 / 选择）：相对静态，由策划录入 ---
-- =============================================================

-- 章节表
CREATE TABLE `chapter` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '章节主键',
  `chapter_code` VARCHAR(64) NOT NULL                COMMENT '稳定业务标识，如 PAN_CHENGDONG',
  `title`       VARCHAR(128) NOT NULL                COMMENT '章节标题，如"第一章：数学之路"',
  `theme`       VARCHAR(128) NULL                    COMMENT '章节主题，如"求索与坚持"',
  `character`   VARCHAR(64)  NULL                    COMMENT '章节主角，如"潘承洞"',
  `order_index` INT          NOT NULL DEFAULT 0      COMMENT '章节顺序',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_chapter_code` (`chapter_code`),
  KEY `idx_order` (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='章节表';

-- 剧情节点表（图的点）
-- 一个节点表示“两次剧情跳转之间的一段连续剧情”
CREATE TABLE `story_node` (
                              `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '剧情节点主键',

                              `chapter_id` BIGINT NOT NULL COMMENT '所属章节',

                              `node_code` VARCHAR(64) NOT NULL
                                  COMMENT '稳定业务标识，如 PROLOGUE_MUSEUM、ROUTE_A_END',

                              `node_type` VARCHAR(16) NOT NULL DEFAULT 'normal'
                                  COMMENT '节点类型：normal普通节点、route_end路线收束、chapter_end章节终点',

                              `title` VARCHAR(128) DEFAULT NULL
                                  COMMENT '节点标题或场景名称',

                              `background_ref` VARCHAR(255) DEFAULT NULL
                                  COMMENT '背景资源标识，如 CAMPUS_PATH、CANTEEN',

                              `cg_ref` VARCHAR(255) DEFAULT NULL
                                  COMMENT '节点使用的CG资源标识',

                              `next_node_id` BIGINT DEFAULT NULL
                                  COMMENT '没有玩家选择时，自动进入的下一节点',

                              `is_entry` TINYINT(1) NOT NULL DEFAULT 0
                                  COMMENT '是否为章节入口节点',

                              `show_in_storyline` TINYINT(1) NOT NULL DEFAULT 0
                                  COMMENT '是否显示在故事线界面',

                              `progress_percent` INT NOT NULL DEFAULT 0
                                  COMMENT '到达该节点时对应的存档总进度，0-100',

                              `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                              `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,

                              PRIMARY KEY (`id`),

                              UNIQUE KEY `uk_node_chapter_code` (`chapter_id`, `node_code`),

                              KEY `idx_node_chapter` (`chapter_id`),

                              KEY `idx_node_next` (`next_node_id`),

                              CONSTRAINT `fk_node_chapter`
                                  FOREIGN KEY (`chapter_id`)
                                      REFERENCES `chapter` (`id`),

                              CONSTRAINT `fk_node_next`
                                  FOREIGN KEY (`next_node_id`)
                                      REFERENCES `story_node` (`id`)
                                      ON DELETE SET NULL,

                              CONSTRAINT `chk_node_progress`
                                  CHECK (`progress_percent` BETWEEN 0 AND 100)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
    COMMENT='剧情节点表';

-- 节点播放内容表
CREATE TABLE `story_line` (
                              `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '剧情播放项主键',

                              `node_id` BIGINT NOT NULL COMMENT '所属剧情节点',

                              `line_type` VARCHAR(16) NOT NULL DEFAULT 'dialogue'
                                  COMMENT '类型：dialogue对话、narration旁白、effect特效',

                              `speaker` VARCHAR(64) DEFAULT NULL
                                  COMMENT '说话人，旁白和特效可以为空',

                              `content` TEXT NULL
                                  COMMENT '显示的台词或旁白，特效行可以为空',

                              `portrait_ref` VARCHAR(255) DEFAULT NULL
                                  COMMENT '角色立绘或表情资源标识',

                              `effect_ref` VARCHAR(255) DEFAULT NULL
                                  COMMENT '特效标识，如 FADE_OUT、FADE_IN、PAUSE',

                              `required_choice_code` VARCHAR(64) DEFAULT NULL
                                  COMMENT '条件台词依赖的选择编码；NULL表示始终可见',

                              `order_index` INT NOT NULL DEFAULT 0
                                  COMMENT '节点内播放顺序，从0开始连续编号',

                              PRIMARY KEY (`id`),

                              UNIQUE KEY `uk_line_node_order` (`node_id`, `order_index`),

                              CONSTRAINT `fk_line_node`
                                  FOREIGN KEY (`node_id`)
                                      REFERENCES `story_node` (`id`)
                                      ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
    COMMENT='节点内按顺序播放的对话、旁白和特效';

# 例如
# node_id = 10
#
# order  line_type  speaker  content/effect
# 1      effect     NULL     FADE_IN
# 2      narration  NULL     这时，一段记忆涌入你的脑海……
# 3      dialogue   潘承洞   对了，我是来这里的数学系担任助教。
# 4      narration  NULL     你走进了学校的大门。


-- 选择/分支表（图的边）
CREATE TABLE `story_choice` (
                                `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '剧情选择主键',

                                `from_node_id` BIGINT NOT NULL
                                    COMMENT '出现该选择的节点',

                                `to_node_id` BIGINT NOT NULL
                                    COMMENT '选择后进入的节点',

                                `choice_code` VARCHAR(64) NOT NULL
                                    COMMENT '稳定业务标识，如 FOOD_NOODLES、ROUTE_A、PROOF_SIEVE',

                                `choice_text` VARCHAR(255) NOT NULL
                                    COMMENT '显示给玩家的选项文案',

                                `order_index` INT NOT NULL DEFAULT 0
                                    COMMENT '同一节点下选项的显示顺序',

                                PRIMARY KEY (`id`),

                                UNIQUE KEY `uk_choice_node_code`
                                    (`from_node_id`, `choice_code`),

                                KEY `idx_choice_from` (`from_node_id`),

                                KEY `idx_choice_to` (`to_node_id`),

                                CONSTRAINT `fk_choice_from`
                                    FOREIGN KEY (`from_node_id`)
                                        REFERENCES `story_node` (`id`)
                                        ON DELETE CASCADE,

                                CONSTRAINT `fk_choice_to`
                                    FOREIGN KEY (`to_node_id`)
                                        REFERENCES `story_node` (`id`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
    COMMENT='剧情选择与分支跳转表';
-- --- 进度侧（存档 / 路径）：玩家动态产生 ---

-- 存档表
-- 使用单存档贯穿任务章节
CREATE TABLE `game_save` (
                             `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '存档主键',

                             `user_id` BIGINT NOT NULL COMMENT '所属用户',

                             `save_name` VARCHAR(64) NOT NULL COMMENT '存档名称',

                             `chapter_id` BIGINT NOT NULL
                                 COMMENT '当前所在章节',

                             `current_node_id` BIGINT NOT NULL
                                 COMMENT '当前所在剧情节点',

                             `current_line_index` INT NOT NULL DEFAULT 0
                                 COMMENT '当前节点内播放到第几条，用于继续游戏',

                             `completion_rate` INT NOT NULL DEFAULT 0
                                 COMMENT '该存档的总游戏完成度，0-100',

                             `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                             `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP
                                 COMMENT '最近保存时间',

                             PRIMARY KEY (`id`),

                             UNIQUE KEY `uk_save_user_chapter_name`
                                 (`user_id`, `chapter_id`, `save_name`),

                             KEY `idx_save_user` (`user_id`),

                             KEY `idx_save_user_updated` (`user_id`, `updated_at`),

                             KEY `idx_save_chapter` (`chapter_id`),

                             KEY `idx_save_current_node` (`current_node_id`),

                             CONSTRAINT `fk_save_user`
                                 FOREIGN KEY (`user_id`)
                                     REFERENCES `user` (`id`)
                                     ON DELETE CASCADE,

                             CONSTRAINT `fk_save_chapter`
                                 FOREIGN KEY (`chapter_id`)
                                     REFERENCES `chapter` (`id`),

                             CONSTRAINT `fk_save_current_node`
                                 FOREIGN KEY (`current_node_id`)
                                     REFERENCES `story_node` (`id`),

                             CONSTRAINT `chk_save_line_index`
                                 CHECK (`current_line_index` >= 0),

                             CONSTRAINT `chk_save_completion`
                                 CHECK (`completion_rate` BETWEEN 0 AND 100)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
    COMMENT='贯穿全部章节的游戏存档';



-- 存档路径表（玩家走过的边，支持回溯与故事线可视化）
CREATE TABLE `save_path` (
                             `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '路径记录主键',

                             `save_id` BIGINT NOT NULL COMMENT '所属存档',

                             `choice_id` BIGINT DEFAULT NULL
                                 COMMENT '到达该节点时做出的选择；线性推进和入口节点为NULL',

                             `node_id` BIGINT NOT NULL COMMENT '到达的剧情节点',

                             `step_index` INT NOT NULL
                                 COMMENT '路径中的步骤序号',

                             `is_active` TINYINT(1) NOT NULL DEFAULT 1
                                 COMMENT '是否属于当前有效路径；回溯后的旧路径设为0',

                             `visited_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                             PRIMARY KEY (`id`),

                             KEY `idx_path_save` (`save_id`),

                             KEY `idx_path_save_active_step`
                                 (`save_id`, `is_active`, `step_index`),

                             KEY `idx_path_choice` (`choice_id`),

                             KEY `idx_path_node` (`node_id`),

                             CONSTRAINT `fk_path_save`
                                 FOREIGN KEY (`save_id`)
                                     REFERENCES `game_save` (`id`)
                                     ON DELETE CASCADE,

                             CONSTRAINT `fk_path_choice`
                                 FOREIGN KEY (`choice_id`)
                                     REFERENCES `story_choice` (`id`),

                             CONSTRAINT `fk_path_node`
                                 FOREIGN KEY (`node_id`)
                                     REFERENCES `story_node` (`id`),

                             CONSTRAINT `chk_path_step`
                                 CHECK (`step_index` >= 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
    COMMENT='玩家走过的剧情路径';



-- =============================================================
-- 模块三：成就系统
-- =============================================================

-- 成就定义表

CREATE TABLE `achievement` (
                               `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '成就主键',

                               `name` VARCHAR(128) NOT NULL COMMENT '成就名称',

                               `description` VARCHAR(255) DEFAULT NULL
                                   COMMENT '成就描述',

                               `icon` VARCHAR(255) DEFAULT NULL
                                   COMMENT '成就图标或图标资源标识',

                               `type` VARCHAR(32) NOT NULL DEFAULT 'chapter'
                                   COMMENT '类型：chapter章节、route路线、global全局',

                               `chapter_id` BIGINT DEFAULT NULL
                                   COMMENT '关联章节；全局成就可以为空',

                               `trigger_node_id` BIGINT DEFAULT NULL
                                   COMMENT '到达该节点时自动解锁；非节点触发时为空',

                               `souvenir` VARCHAR(128) DEFAULT NULL
                                   COMMENT '解锁后获得的纪念物',

                               `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               PRIMARY KEY (`id`),

                               KEY `idx_achievement_chapter` (`chapter_id`),

                               KEY `idx_achievement_trigger_node` (`trigger_node_id`),

                               CONSTRAINT `fk_achievement_chapter`
                                   FOREIGN KEY (`chapter_id`)
                                       REFERENCES `chapter` (`id`),

                               CONSTRAINT `fk_achievement_trigger_node`
                                   FOREIGN KEY (`trigger_node_id`)
                                       REFERENCES `story_node` (`id`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
    COMMENT='成就定义表';


-- 用户成就关联表

CREATE TABLE `user_achievement` (
                                    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键',

                                    `user_id` BIGINT NOT NULL COMMENT '用户主键',

                                    `achievement_id` BIGINT NOT NULL COMMENT '成就主键',

                                    `unlocked_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        COMMENT '解锁时间',

                                    PRIMARY KEY (`id`),

                                    UNIQUE KEY `uk_user_achievement`
                                        (`user_id`, `achievement_id`),

                                    KEY `idx_user_achievement_achievement`
                                        (`achievement_id`),

                                    CONSTRAINT `fk_user_achievement_user`
                                        FOREIGN KEY (`user_id`)
                                            REFERENCES `user` (`id`)
                                            ON DELETE CASCADE,

                                    CONSTRAINT `fk_user_achievement_achievement`
                                        FOREIGN KEY (`achievement_id`)
                                            REFERENCES `achievement` (`id`)
                                            ON DELETE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
    COMMENT='用户已解锁成就';
