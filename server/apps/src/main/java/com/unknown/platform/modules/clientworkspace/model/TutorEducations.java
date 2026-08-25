package com.unknown.platform.modules.clientworkspace.model;

import com.unknown.platform.common.exception.BusinessException;
import java.util.Map;
import java.util.Set;

/**
 * 家教学历 KEY 的后端唯一标准，跟前端 {@code db/tutorEducation.ts} 的 {@code TutorEducation} 枚举一一对应。
 * 数据库（{@code tutor_certification.education}）和接口提交参数只接受这里定义的 KEY，不接受中文文案；
 * {@link #requireValidKey} 供提交家教认证等写入路径统一校验。
 */
public final class TutorEducations {
  public static final String BACHELOR = "BACHELOR";
  public static final String MASTER = "MASTER";
  public static final String DOCTORATE = "DOCTORATE";

  private static final Set<String> KEYS = Set.of(BACHELOR, MASTER, DOCTORATE);

  /** KEY → 中文展示文案，仅供后端拼装提示文案使用，接口响应字段本身仍返回 KEY。 */
  private static final Map<String, String> LABELS = Map.of(
      BACHELOR, "本科",
      MASTER, "硕士",
      DOCTORATE, "博士"
  );

  private TutorEducations() {
  }

  /** 校验学历 KEY 合法，非法 KEY 抛出稳定错误码。 */
  public static void requireValidKey(String educationKey) {
    if (educationKey == null || educationKey.isBlank()) {
      throw new BusinessException("TUTOR_EDUCATION_REQUIRED", "请选择学历");
    }
    if (!KEYS.contains(educationKey)) {
      throw new BusinessException("TUTOR_EDUCATION_INVALID", "不支持的学历：" + educationKey);
    }
  }

  /** 学历 KEY 转中文展示文案，查不到时兜底返回原始 KEY。 */
  public static String label(String key) {
    return LABELS.getOrDefault(key, key);
  }
}
