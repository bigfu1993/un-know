package com.unknown.platform.modules.clientworkspace.model;

import com.unknown.platform.common.exception.BusinessException;
import java.util.Map;
import java.util.Set;

/**
 * 性别 KEY 的后端唯一标准，跟前端 {@code db/gender.ts} 的 {@code Gender} 枚举一一对应。数据库
 * （{@code tutor_certification.gender}）和接口提交参数只接受这里定义的 KEY，不接受中文文案；
 * {@link #requireValidKey} 供提交家教认证、狩猎认证等写入路径统一校验。性别不是家教专属概念，
 * 但跟 {@link TutorSubjects}/{@link TutorEducations} 一样属于固定选项校验，沿用同一个包保持一致。
 */
public final class Genders {
  public static final String MALE = "MALE";
  public static final String FEMALE = "FEMALE";
  public static final String OTHER = "OTHER";

  private static final Set<String> KEYS = Set.of(MALE, FEMALE, OTHER);

  /** KEY → 中文展示文案，仅供后端拼装提示文案使用，接口响应字段本身仍返回 KEY。 */
  private static final Map<String, String> LABELS = Map.of(
      MALE, "男",
      FEMALE, "女",
      OTHER, "其他"
  );

  private Genders() {
  }

  /** 校验性别 KEY 合法，非法 KEY 抛出稳定错误码。 */
  public static void requireValidKey(String genderKey) {
    if (genderKey == null || genderKey.isBlank()) {
      throw new BusinessException("GENDER_REQUIRED", "请选择性别");
    }
    if (!KEYS.contains(genderKey)) {
      throw new BusinessException("GENDER_INVALID", "不支持的性别：" + genderKey);
    }
  }

  /** 性别 KEY 转中文展示文案，查不到时兜底返回原始 KEY。 */
  public static String label(String key) {
    return LABELS.getOrDefault(key, key);
  }
}
