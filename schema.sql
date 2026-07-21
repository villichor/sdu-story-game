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
-- 模块一：用户系统
-- =============================================================

-- 用户表：同时容纳游客与正式账号
CREATE TABLE `user` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT COMMENT '用户主键',
  `username`      VARCHAR(64)  NOT NULL                COMMENT '用户名/昵称，如"游客001"',
  `is_guest`      TINYINT(1)   NOT NULL DEFAULT 1      COMMENT '是否游客：1游客 0正式账号',
  `student_id`    VARCHAR(32)  NULL                    COMMENT '学号，正式账号才有，游客为NULL',
  `password_hash` VARCHAR(255) NULL                    COMMENT '密码散列，接统一认证后可弃用',
  `avatar_url`    VARCHAR(255) NULL                    COMMENT '头像地址',
  `progress_rate` INT          NOT NULL DEFAULT 0      COMMENT '总游戏进度百分比 0-100',
  `unlocked_story_count` INT   NOT NULL DEFAULT 0      COMMENT '已解锁故事数',
  `achievement_count`    INT   NOT NULL DEFAULT 0      COMMENT '已获成就数',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- =============================================================
-- 模块二：剧情存档系统
-- --- 内容侧（章节 / 节点 / 选择）：相对静态，由策划录入 ---
-- =============================================================

-- 章节表
CREATE TABLE `chapter` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '章节主键',
  `title`       VARCHAR(128) NOT NULL                COMMENT '章节标题，如"第一章：数学之路"',
  `theme`       VARCHAR(128) NULL                    COMMENT '章节主题，如"求索与坚持"',
  `character`   VARCHAR(64)  NULL                    COMMENT '章节主角，如"潘承洞"',
  `order_index` INT          NOT NULL DEFAULT 0      COMMENT '章节顺序',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order` (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='章节表';

-- 剧情节点表（图的点）
CREATE TABLE `story_node` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT COMMENT '节点主键',
  `chapter_id` BIGINT       NOT NULL                COMMENT '所属章节',
  `node_type`  VARCHAR(16)  NOT NULL DEFAULT 'dialogue' COMMENT '节点类型：dialogue对话/scene场景/ending结局',
  `title`      VARCHAR(128) NULL                    COMMENT '节点标题/场景名',
  `content`    TEXT         NULL                    COMMENT '台词或场景描述',
  `is_entry`   TINYINT(1)   NOT NULL DEFAULT 0      COMMENT '是否章节入口节点',
  `cg_ref`     VARCHAR(255) NULL                    COMMENT '特殊CG资源引用',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chapter` (`chapter_id`),
  CONSTRAINT `fk_node_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapter` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='剧情节点表';

-- 选择/分支表（图的边）
CREATE TABLE `story_choice` (
  `id`           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '选择主键',
  `from_node_id` BIGINT       NOT NULL                COMMENT '起点节点',
  `to_node_id`   BIGINT       NOT NULL                COMMENT '指向的下一节点',
  `choice_text`  VARCHAR(255) NOT NULL                COMMENT '选项文案，如"坚持研究"',
  `effect`       VARCHAR(255) NULL                    COMMENT '选择影响，如"成长值+5"',
  `order_index`  INT          NOT NULL DEFAULT 0      COMMENT '同节点下选项顺序',
  PRIMARY KEY (`id`),
  KEY `idx_from` (`from_node_id`),
  KEY `idx_to` (`to_node_id`),
  CONSTRAINT `fk_choice_from` FOREIGN KEY (`from_node_id`) REFERENCES `story_node` (`id`),
  CONSTRAINT `fk_choice_to`   FOREIGN KEY (`to_node_id`)   REFERENCES `story_node` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='剧情选择/分支表';

-- --- 进度侧（存档 / 路径）：玩家动态产生 ---

-- 存档表
CREATE TABLE `game_save` (
  `id`              BIGINT      NOT NULL AUTO_INCREMENT COMMENT '存档主键',
  `user_id`         BIGINT      NOT NULL                COMMENT '所属用户',
  `save_name`       VARCHAR(64) NOT NULL                COMMENT '存档名，如"存档一"',
  `chapter_id`      BIGINT      NOT NULL                COMMENT '当前所在章节',
  `current_node_id` BIGINT      NOT NULL                COMMENT '当前停留节点',
  `completion_rate` INT         NOT NULL DEFAULT 0      COMMENT '当前存档完成度百分比 0-100',
  `created_at`      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最近保存时间，用于自动加载最近存档',
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_user_updated` (`user_id`, `updated_at`),
  CONSTRAINT `fk_save_user`    FOREIGN KEY (`user_id`)         REFERENCES `user` (`id`),
  CONSTRAINT `fk_save_chapter` FOREIGN KEY (`chapter_id`)      REFERENCES `chapter` (`id`),
  CONSTRAINT `fk_save_node`    FOREIGN KEY (`current_node_id`) REFERENCES `story_node` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游戏存档表';

-- 存档路径表（玩家走过的边，支持回溯与故事线可视化）
CREATE TABLE `save_path` (
  `id`         BIGINT   NOT NULL AUTO_INCREMENT COMMENT '路径记录主键',
  `save_id`    BIGINT   NOT NULL                COMMENT '所属存档',
  `choice_id`  BIGINT   NULL                    COMMENT '走过的选择（章节入口首节点可为NULL）',
  `node_id`    BIGINT   NOT NULL                COMMENT '到达的节点',
  `step_index` INT      NOT NULL DEFAULT 0      COMMENT '第几步，用于排序还原路径',
  `is_active`  TINYINT(1) NOT NULL DEFAULT 1    COMMENT '是否有效：回溯后旧分支置0',
  `visited_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_save` (`save_id`),
  KEY `idx_save_step` (`save_id`, `step_index`),
  CONSTRAINT `fk_path_save`   FOREIGN KEY (`save_id`)   REFERENCES `game_save` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_path_choice` FOREIGN KEY (`choice_id`) REFERENCES `story_choice` (`id`),
  CONSTRAINT `fk_path_node`   FOREIGN KEY (`node_id`)   REFERENCES `story_node` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='存档走过的路径表';

-- =============================================================
-- 模块三：成就系统
-- =============================================================

-- 成就定义表
CREATE TABLE `achievement` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '成就主键',
  `name`        VARCHAR(128) NOT NULL                COMMENT '成就名，如"求索之心"',
  `description` VARCHAR(255) NULL                    COMMENT '达成条件描述，如"完成潘承洞故事"',
  `icon`        VARCHAR(64)  NULL                    COMMENT '图标/emoji',
  `type`        VARCHAR(64)  NULL                    COMMENT '成就类型分类',
  `chapter_id`  BIGINT       NULL                    COMMENT '关联章节（可空，全局成就无章节）',
  `souvenir`    VARCHAR(128) NULL                    COMMENT '章节完成后的纪念物',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chapter` (`chapter_id`),
  CONSTRAINT `fk_ach_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapter` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成就定义表';

-- 用户成就关联表
CREATE TABLE `user_achievement` (
  `id`             BIGINT   NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id`        BIGINT   NOT NULL                COMMENT '用户',
  `achievement_id` BIGINT   NOT NULL                COMMENT '成就',
  `is_unlocked`    TINYINT(1) NOT NULL DEFAULT 0    COMMENT '是否已获得',
  `unlocked_at`    DATETIME NULL                    COMMENT '获得时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_ach` (`user_id`, `achievement_id`),
  CONSTRAINT `fk_ua_user` FOREIGN KEY (`user_id`)        REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ua_ach`  FOREIGN KEY (`achievement_id`) REFERENCES `achievement` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户成就关联表';
