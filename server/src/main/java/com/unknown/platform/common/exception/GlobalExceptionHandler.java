package com.unknown.platform.common.exception;

import com.unknown.platform.common.api.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** 全局异常处理器，将业务异常、参数校验异常和兜底异常统一转换为 ApiResponse。 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  /**
   * 处理可预期业务异常。
   *
   * @param ex 业务异常
   * @return 400 响应和稳定错误码
   */
  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException ex) {
    return ResponseEntity.badRequest().body(ApiResponse.error(ex.code(), ex.getMessage()));
  }

  /**
   * 处理请求参数和 Bean Validation 校验异常。
   *
   * @param ex 校验异常
   * @return 400 校验失败响应
   */
  @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class})
  public ResponseEntity<ApiResponse<Void>> handleValidationException(Exception ex) {
    return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", ex.getMessage()));
  }

  /**
   * 兜底处理未预期异常，避免向前端泄露服务端细节。
   *
   * @param ex 未预期异常
   * @return 500 统一错误响应
   */
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
    return ResponseEntity
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiResponse.error("INTERNAL_ERROR", "服务暂时不可用"));
  }
}
