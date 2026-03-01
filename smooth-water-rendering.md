# 瓶内液体倾斜、液柱与波纹 — Cocos Creator 3.x 参考

> 面向 Cocos 3.8.x，保留：液体倾斜角、倾倒液柱、被倒入水层波纹、倾倒锚点。最大水层数与项目一致为 **4**。Effect 为 3.x 语法，与 2.x 不兼容处已修正。

---

## 一、架构与角色

### 1.1 当前项目（Graphics + Mask）

- 瓶子：`BottleSprite` + `WaterContainer`（Mask）
- 水层：多节点 Graphics 矩形堆叠，倾倒时液柱用 Graphics 画线、目标瓶用 `setIncomingPour` 做上涨块。
- 倾斜：倾倒动画中瓶子 `angle` 驱动，锚点可设在瓶口（项目已实现锚点与倾倒流程）。

### 1.2 可选：单 Sprite + 自定义 Effect（参考用）

若后续改为「单 Sprite + Shader」渲染瓶内液体，可参考下列结构：

```
Bottle（可旋转）
 └── WaterSprite（Sprite + 自定义材质）
      └── water-sort-liquid.effect
```

- Shader 内：瓶形纹理 alpha 裁切 + 按层高度与倾斜角、波纹绘制多色液面。
- 倾斜：每帧把 `node.angle` 同步到材质的 `tiltAngle`，液面几何在片元里统一算。

---

## 二、液体倾斜与水面几何（Shader 侧）

### 2.1 倾斜角同步

瓶子旋转角实时写入材质，Shader 用该角重算液面线：

```typescript
// 每帧同步（若使用自定义材质时）
if (this._waterMaterial && this.node.angle !== this._lastAngle) {
    this._lastAngle = this.node.angle;
    this._waterMaterial.setProperty('tiltAngle', this.node.angle);
}
```

### 2.2 水面中心点（体积守恒）

- UV：`(0,0)` 左下，`(1,1)` 右上；无倾斜时累积高度 `_height` 对应水面中心 `center = (0.5, 1.0 - _height)`。
- 设 `_t = |tan(angle)|`，`toLeft = sin(angle) >= 0`，`ratio = height/width`。

**水量 < 50%（`_height < 0.5`）**

- 倾斜到瓶底：`center.x = sqrt(2*_height/_t*ratio)/2`，`center.y = 1.0 - sqrt(2*_height*_t/ratio)/2`。
- 再倾到瓶口：`center.y = 0.5`，`center.x = _height`；若向右倾则 `center.x = 1.0 - center.x`。

**水量 ≥ 50%（`_height >= 0.5`）**

- 倾斜到瓶顶：`center.x = sqrt(2*ratio*(1-_height)/_t)/2`，`center.y = sqrt(2*ratio*(1-_height)*_t)/2/ratio`。
- 再倾到瓶底：`center.y = 0.5`，`center.x = 1.0 - _height`；若向左倾则 `center.x = 1.0 - center.x`。

### 2.3 UV 变换与水面判定

1. `uv.y *= ratio`，再减去 `center`，绕原点旋转 `angle` 得 `uv1`。
2. 仅最顶层可加波纹：`y = amplitude * sin(omega*uv1.x + freq*time*direction)`，`waveType`：0=无，1=加水波纹，2=倒水波纹。
3. 判定：旋转后 `uv1.y > y` 为水面以上（透明），否则为该层颜色。

旋转函数示例：

```glsl
vec2 rotatePt(vec2 uv, float angle, vec2 center) {
    float c = cos(angle), s = sin(angle);
    vec2 d = uv - center;
    return vec2(c*d.x - s*d.y, s*d.x + c*d.y) + center;
}
```

---

## 三、倾倒逻辑要点（与项目一致）

- **锚点**：倾倒前把瓶子锚点设到瓶口侧，旋转时视觉上绕瓶口倾（项目已实现）。
- **临界角**：水刚好到瓶口的角度，由当前总水面高度与宽高比决定；`waterHeight < 0.5` 用 `atan(ratio/(waterHeight*2))`，否则用 `atan(2*ratio*(1-waterHeight))`，再转成角度。
- **时间线**：移动+倾到 startAngle → 继续倾到 endAngle（同时源瓶减顶层高度、目标瓶增加新层/液柱）→ 回位。
- **液柱与目标瓶上涨**：项目已用 Graphics 液流 + `setIncomingPour` 做液柱与倒入水层上涨；若用 Shader 渲染瓶内液体，仅需在倒入时对最顶层设 `waveType = 2`（倒水波纹）即可。

---

## 四、Cocos 3.x Effect 参考（3.8，最大 4 层）

- **最大水层数**：`MAX_LAYERS = 4`，与项目一致。
- **properties**：不声明 `colors`/`heights` 等大数组，避免 EFX3302；仅保留 `mainTexture`、`resolution`、`tiltAngle`、`waveType`，数组由 TS 用 `setProperty` 传入。
- **UBO**：所有自定义 uniform 放在 `LiquidParams` 中，数组用 `vec4 colors[4]`、`vec4 heights[4]`（每层高度用 `.x`）。

以下为完整 3.x 写法，可直接新建 `.effect` 使用。

```glsl
// Cocos Creator 3.8.x — 瓶内液体（倾斜+多色层+波纹），MAX_LAYERS=4
// 用法：创建 Material 选本 Effect，赋给水 Sprite；colors/heights 由 TS setProperty 传入

CCEffect %{
  techniques:
  - name: transparent
    passes:
    - vert: general-vs:vert
      frag: liquid-fs:frag
      depthStencilState:
        depthTest: false
        depthWrite: false
      blendState:
        targets:
        - blend: true
          blendSrc: src_alpha
          blendDst: one_minus_src_alpha
      rasterizerState:
        cullMode: none
      properties:
        mainTexture: { value: white }
        resolution:  { value: [1, 1] }
        tiltAngle:   { value: 0 }
        waveType:    { value: 0 }
}%

CCProgram liquid-fs %{
  precision highp float;
  #include <legacy/output>
  #include <builtin/uniforms/cc-global>  // cc_time.x 用于波纹动画

  in vec2 v_uv;

  #define PI 3.14159265359
  #define MAX_LAYERS 4

  uniform sampler2D mainTexture;

  uniform LiquidParams {
    vec4 colors[4];
    vec4 heights[4];
    vec2 resolution;
    float tiltAngle;
    float waveType;
  };

  vec2 rotatePt(vec2 uv, float angle, vec2 center) {
    float c = cos(angle), s = sin(angle);
    vec2 d = uv - center;
    return vec2(c*d.x - s*d.y, s*d.x + c*d.y) + center;
  }

  float drawWater(vec2 uv, float angle, float _height, int layerCount, int curIdx) {
    float ratio = resolution.y / resolution.x;
    bool toLeft = sin(angle) >= 0.0;
    vec2 center = vec2(0.5, 1.0 - _height);
    float _t = abs(tan(angle));

    if (_height < 0.5) {
      if (_t / ratio > 2.0 * _height) {
        center.x = sqrt(2.0 * _height / _t * ratio) / 2.0;
        center.y = 1.0 - sqrt(2.0 * _height * _t / ratio) / 2.0;
        if (_t > ratio / (_height * 2.0)) {
          center.y = 0.5;
          center.x = _height;
        }
      }
      if (!toLeft) center.x = 1.0 - center.x;
    } else {
      if (_t > 2.0 * ratio * (1.0 - _height)) {
        center.x = sqrt(2.0 * ratio * (1.0 - _height) / _t) / 2.0;
        center.y = sqrt(2.0 * ratio * (1.0 - _height) * _t) / 2.0 / ratio;
        if (_t > ratio / (2.0 * (1.0 - _height))) {
          center.y = 0.5;
          center.x = 1.0 - _height;
        }
      }
      if (toLeft) center.x = 1.0 - center.x;
    }

    uv.y *= ratio;
    uv -= vec2(center.x, center.y * ratio);
    vec2 uv1 = rotatePt(uv, angle, vec2(0.0));

    float y = 0.0;
    bool isTopLayer = (curIdx == layerCount - 1);
    if (isTopLayer && abs(waveType) > 0.01) {
      float amplitude = abs(waveType - 1.0) < 0.01 ? 0.08 : 0.03;
      float omega     = abs(waveType - 1.0) < 0.01 ? 10.0 : 5.0;
      float freq      = abs(waveType - 1.0) < 0.01 ? 10.0 : 6.0;
      y = amplitude * sin(omega * uv1.x + freq * cc_time.x * (toLeft ? 1.0 : -1.0));
    }

    return (uv1.y > y) ? 1.0 : 0.0;
  }

  vec4 frag() {
    vec4 texColor = texture(mainTexture, v_uv);
    if (texColor.a < 0.01) discard;

    float angle = mod(tiltAngle, 360.0) * PI / 180.0;

    int layerCount = 0;
    for (int i = 0; i < MAX_LAYERS; i++) {
      if (heights[i].x > 0.001) layerCount++;
    }

    float cumHeight = 0.0;
    for (int i = 0; i < MAX_LAYERS; i++) {
      if (heights[i].x < 0.001) continue;
      cumHeight += heights[i].x;
      float a = drawWater(v_uv, angle, cumHeight, layerCount, i);
      if (a > 0.0) {
        return CCFragOutput(texColor * a * colors[i]);
      }
    }

    discard;
    return CCFragOutput(vec4(0.0));
  }
}%
```

- 顶点阶段使用内置 `general-vs:vert`，会提供 `v_uv`。
- 片元中所有 Uniform 均参与最终颜色计算，避免 3.x 死代码消除导致 `setProperty` 报错。

---

## 五、TypeScript 材质对接（3.x）

- `resolution`：`material.setProperty('resolution', new Vec2(width, height))`。
- `tiltAngle`：每帧 `material.setProperty('tiltAngle', this.node.angle)`。
- `waveType`：0 / 1 / 2，倒入目标瓶时对最顶层设 2。
- `colors`：`Float32Array(4*4)`，每层 RGBA，例如 `colors[i*4+0..3] = r,g,b,1`（归一化 0～1）。
- `heights`：`Float32Array(4*4)`，每层高度放在 `heights[i*4]`，其余分量可填 0。

多瓶共用同一 Effect 时，应对每个 Sprite 使用 `getMaterialInstance(0)` 得到独立材质实例再 `setProperty`。

---

## 六、水流线动画

与现有实现一致：在瓶子父节点上用 Graphics 从源瓶口到目标瓶口画线，`lineCap = ROUND`，颜色为倾倒颜色，用 tween 插值终点即可。项目已有 `_streamNode` 与 Phase3 液流逻辑，可保留。

---

## 七、Cocos 3.8.x 注意点

1. **不在 properties 里放大数组**：避免 EFX3302，`colors`/`heights` 只在 UBO 中声明，由 TS 传入。
2. **UBO 数组长度必须为字面量（EFX2202）**：UBO 中 `vec4 colors[MAX_LAYERS]` 会报错，编译器不认 `#define` 宏。应直接写 `vec4 colors[4]`、`vec4 heights[4]`，循环里仍可用 `MAX_LAYERS`。
3. **UBO 对齐**：数组元素至少为 `vec4`，高度用 `vec4` 的 `.x` 存储。
4. **死代码消除**：UBO 中的变量必须在 frag 的最终颜色计算中被使用，否则会被删掉，`setProperty` 报 illegal property name。
5. **自定义 Uniform 全进 UBO**：不要写单独的 `uniform float xxx`，统一放在 `uniform LiquidParams { ... }` 中。

---

## 八、实现检查清单（可选 Shader 方案时）

- [ ] 新建 `water-sort-liquid.effect`（用上节 3.x 模板，MAX_LAYERS=4）
- [ ] 创建 Material 选该 Effect，赋给水 Sprite
- [ ] 脚本中同步 `node.angle → tiltAngle`，并设置 `resolution`/`colors`/`heights`/`waveType`
- [ ] 倾倒时对目标瓶最顶层设 `waveType=2` 做倒入波纹
- [ ] 液柱与回位逻辑继续使用现有 Graphics + `setIncomingPour`

> **波纹时间变量**：片元中 `cc_time.x` 来自内置 `cc-global`。若编译报错，请根据当前引擎版本将 `#include <builtin/uniforms/cc-global>` 改为正确的 builtin 时间 uniform 头路径。
