#ifndef GUIACAMPUS_IMU_ORIENTATION_H
#define GUIACAMPUS_IMU_ORIENTATION_H

#include <math.h>
#include <stdint.h>

namespace guiacampus {
struct Vector3 { float x, y, z; };
struct Tilt { float pitch, roll; };
enum class CalibrationResult { Waiting, Accepted, Rejected };

// Pure math shared by the sketch and host tests. Axes stay in sensor coordinates;
// only pitch/roll use the explicitly captured neutral reference.
class ImuOrientation {
 public:
  static constexpr unsigned SampleCount = 40;
  void beginCalibration() {
    collecting_ = true;
    count_ = 0;
    meanAccel_ = meanGyro_ = accelM2_ = gyroM2_ = {0, 0, 0};
  }
  void reset() {
    collecting_ = calibrated_ = false;
    count_ = 0;
    bias_ = {0, 0, 0};
    sinPitch_ = sinRoll_ = 0;
    cosPitch_ = cosRoll_ = 1;
  }
  void cancelCalibration() { collecting_ = false; }
  bool collecting() const { return collecting_; }
  bool calibrated() const { return calibrated_; }
  unsigned samples() const { return count_; }
  Vector3 gyroBias() const { return bias_; }

  CalibrationResult addCalibrationSample(Vector3 accel, Vector3 gyro) {
    if (!collecting_) return CalibrationResult::Waiting;
    const float gravity = length(accel);
    // Bounds are a motion sanity check, not proof of stillness. Keep the unit
    // physically still in its intended neutral pose throughout calibration.
    if (!finite(accel) || !finite(gyro) || gravity < 7.8f || gravity > 11.8f || length(gyro) > 3.0f) {
      collecting_ = false;
      return CalibrationResult::Rejected;
    }
    ++count_;
    accumulate(accel, meanAccel_, accelM2_);
    accumulate(gyro, meanGyro_, gyroM2_);
    if (count_ < SampleCount) return CalibrationResult::Waiting;
    collecting_ = false;
    const float accelVariance = (accelM2_.x + accelM2_.y + accelM2_.z) / (count_ - 1);
    const float gyroVariance = (gyroM2_.x + gyroM2_.y + gyroM2_.z) / (count_ - 1);
    if (accelVariance > 0.04f || gyroVariance > 0.09f) return CalibrationResult::Rejected;

    const Tilt reference = tilt(meanAccel_);
    constexpr float radians = 0.017453292519943295f;
    sinPitch_ = sinf(reference.pitch * radians);
    cosPitch_ = cosf(reference.pitch * radians);
    sinRoll_ = sinf(reference.roll * radians);
    cosRoll_ = cosf(reference.roll * radians);
    bias_ = meanGyro_;
    calibrated_ = true;
    return CalibrationResult::Accepted;
  }

  Vector3 correctedGyro(Vector3 gyro) const {
    return {gyro.x - bias_.x, gyro.y - bias_.y, gyro.z - bias_.z};
  }
  Tilt orientation(Vector3 accel) const {
    // Rotate the gravity vector into the reference frame; subtracting Euler
    // angles alone fails near +/-90 pitch and the +/-180 roll discontinuity.
    const float y = cosRoll_ * accel.y - sinRoll_ * accel.z;
    const float z = sinRoll_ * accel.y + cosRoll_ * accel.z;
    return tilt({cosPitch_ * accel.x + sinPitch_ * z, y,
                 -sinPitch_ * accel.x + cosPitch_ * z});
  }
  static int16_t signedBigEndian(const uint8_t* bytes) {
    const uint16_t word = (uint16_t(bytes[0]) << 8) | bytes[1];
    return static_cast<int16_t>(word < 0x8000 ? int32_t(word) : int32_t(word) - 65536);
  }

 private:
  bool collecting_ = false, calibrated_ = false;
  unsigned count_ = 0;
  Vector3 meanAccel_{0,0,0}, meanGyro_{0,0,0}, accelM2_{0,0,0}, gyroM2_{0,0,0}, bias_{0,0,0};
  float sinPitch_ = 0, cosPitch_ = 1, sinRoll_ = 0, cosRoll_ = 1;
  static bool finite(Vector3 v) { return isfinite(v.x) && isfinite(v.y) && isfinite(v.z); }
  static float length(Vector3 v) { return sqrtf(v.x*v.x + v.y*v.y + v.z*v.z); }
  static Tilt tilt(Vector3 a) {
    constexpr float degrees = 57.29577951308232f;
    return {atan2f(-a.x, hypotf(a.y, a.z)) * degrees, atan2f(a.y, a.z) * degrees};
  }
  void accumulate(Vector3 value, Vector3& mean, Vector3& m2) {
    const Vector3 delta{value.x-mean.x, value.y-mean.y, value.z-mean.z};
    mean.x += delta.x/count_; mean.y += delta.y/count_; mean.z += delta.z/count_;
    m2.x += delta.x*(value.x-mean.x); m2.y += delta.y*(value.y-mean.y); m2.z += delta.z*(value.z-mean.z);
  }
};
}
#endif
