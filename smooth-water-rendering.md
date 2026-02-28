# 丝滑瓶内液体渲染 & 倾倒动画 — Cocos Creator 3.x 实现指南

> 基于 Cocos 2.x 参考项目逆向分析，提炼核心原理，面向 Cocos 3.x（3.8.x）重新实现。

---

## 一、架构总览

### 1.1 参考项目架构（Cocos 2.x）

```
Cup（瓶子节点，可旋转）
 └── Water（Sprite + 自定义材质）
      └── water-wave.effect（自定义 Shader，一次绘制所有水层）
```

**关键设计**：整个瓶内液体是 **1 个 Sprite 节点 + 1 个自定义 Shader**，不是多个节点拼接。所有水层颜色、高度、倾斜角度、波纹全部在 **片元着色器** 中一次性完成。

### 1.2 目标项目架构（Cocos 3.x）

```
Bottle（瓶子节点，可旋转）
 ├── BottleSprite（瓶身外观 Sprite，z 较高）
 └── WaterSprite（Sprite + 自定义 Effect 材质，z 较低）
      └── water-sort-liquid.effect（Cocos 3.x 语法的自定义 Shader）
```

- `WaterSprite` 的 SpriteFrame 使用 **瓶子内腔形状贴图**（即现有的 `x_2.png`）
- Shader 采样这张纹理，透明区域 discard → 液体完美贴合瓶形
- 瓶身外观 Sprite 叠在水层之上，形成"液体在瓶子里面"的视觉

---

## 二、无毛边液体渲染 — Shader 核心原理

### 2.1 为什么 Shader 方案没有毛边

| 方案 | 原理 | 毛边情况 |
|------|------|----------|
| 多节点 + Mask 裁切 | 多个 Graphics 矩形堆叠，外层 Mask 裁剪 | 层间缝隙、Mask 边缘锯齿 |
| **单 Shader 方案** | 一张瓶形纹理 + 片元逐像素判断是否在水面下 | 边缘由纹理 alpha 决定，像素级精确 |

核心逻辑：

```
对每个像素：
1. 采样瓶形纹理 → alpha == 0 → discard（瓶外像素丢弃）
2. 从底层到顶层遍历水层：
   - 计算该层水面线位置（考虑倾斜角）
   - 当前像素在水面线以下 → 着色为该层颜色，break
   - 当前像素在水面线以上 → 继续检查上一层
3. 所有层都未命中 → discard（水面以上的瓶内空气）
```

### 2.2 Shader Uniform 设计

```glsl
#define MAX_LAYERS 6

uniform LiquidParams {
  vec4 colors[MAX_LAYERS];   // 每层颜色 (r, g, b, a)，从底层到顶层
  vec4 heights[MAX_LAYERS];  // 每层高度存在 .x 分量，归一化值 [0, HEIGHT_FACTOR]
  vec2 resolution;           // 节点宽高 (width, height)
  float tiltAngle;           // 倾斜角度（度），来自瓶子节点的 angle
  float waveType;            // 波纹类型：0=无，1=加水波纹，2=倒水波纹
};
```

**高度约定**：
- `HEIGHT_FACTOR = 0.8`（满杯水只占瓶子 80% 高度，顶部留空模拟瓶口）
- 每层 `height` 值为该层占瓶子高度的比例，如 4 层满杯时每层 `0.2`
- 累加高度 `_height` 从 0 到 `HEIGHT_FACTOR`

### 2.3 水面几何计算 — `drawWater()` 函数

这是 Shader 的核心。对于给定的倾斜角 `angle` 和累积水面高度 `_height`，计算当前像素是否在水面以下。

#### 2.3.1 坐标系

- UV 坐标：`(0,0)` 左下角，`(1,1)` 右上角
- 水面中心点 `center`：无倾斜时为 `(0.5, 1.0 - _height)`
- 宽高比 `ratio = height / width`

#### 2.3.2 倾斜时的水面中心点计算（体积守恒）

设 `_t = |tan(angle)|`，`toLeft = sin(angle) >= 0`

**情况 A：水量 < 50%（`_height < 0.5`）**

```
默认 center = (0.5, 1.0 - _height)

① 倾斜达到瓶底（_t / ratio > 2.0 * _height）：
   center.x = sqrt(2.0 * _height / _t * ratio) / 2.0
   center.y = 1.0 - sqrt(2.0 * _height * _t / ratio) / 2.0

② 继续倾斜达到瓶口（_t > ratio / (_height * 2.0)）：
   center.y = 0.5
   center.x = _height（水完全倒向一侧）

若向右倾（!toLeft）：center.x = 1.0 - center.x
```

**情况 B：水量 ≥ 50%（`_height >= 0.5`）**

```
默认 center = (0.5, 1.0 - _height)

① 倾斜达到瓶顶（_t > 2.0 * ratio * (1.0 - _height)）：
   center.x = sqrt(2.0 * ratio * (1.0 - _height) / _t) / 2.0
   center.y = sqrt(2.0 * ratio * (1.0 - _height) * _t) / 2.0 / ratio

② 继续倾斜达到瓶底（_t > ratio / (2.0 * (1.0 - _height))）：
   center.y = 0.5
   center.x = 1.0 - _height

若向左倾（toLeft）：center.x = 1.0 - center.x
```

**数学直觉**：把瓶子看作矩形容器，液体体积 = 宽 × _height。倾斜时液面变成一条斜线，体积不变，用三角形/梯形面积公式反推斜线端点位置。

#### 2.3.3 UV 变换与水面判定

```glsl
// 1. UV 缩放为等比坐标
uv.y = uv.y * ratio;

// 2. 平移，使 center 成为原点
uv -= vec2(center.x, center.y * ratio);

// 3. 绕原点旋转 angle 度
vec2 uv1 = rotatePt(uv, angle, vec2(0.0));

// 4. 波纹（仅最上层）
float y = 0.0;
if (isTopLayer && waveType > 0) {
    float amplitude = (waveType == 1) ? 0.08 : 0.03;
    float omega     = (waveType == 1) ? 10.0 : 5.0;
    float freq      = (waveType == 1) ? 10.0 : 6.0;
    y = amplitude * sin(omega * uv1.x + freq * time * (toLeft ? 1.0 : -1.0));
}

// 5. 判定：旋转后 y > 波纹线 → 在水面以上 → alpha = 0
//          旋转后 y <= 波纹线 → 在水面以下 → alpha = 1
float alpha = (uv1.y > y) ? 1.0 : 0.0;
```

#### 2.3.4 旋转函数 `rotatePt`

```glsl
vec2 rotatePt(vec2 uv, float angle, vec2 center) {
    float c = cos(angle);
    float s = sin(angle);
    mat2 rot = mat2(c, s, -s, c);
    return rot * (uv - center) + center;
}
```

### 2.4 片元着色器主函数伪代码

```glsl
void main() {
    // 1. 采样瓶形纹理
    vec4 texColor = texture(bottleTexture, v_uv0);
    if (texColor.a < 0.01) discard;  // 瓶外区域丢弃 → 无毛边

    // 2. 计算倾斜角（弧度）
    float angle = mod(tiltAngle, 360.0) * PI / 180.0;

    // 3. 统计有效层数
    int layerCount = 0;
    for (int i = 0; i < MAX_LAYERS; i++) {
        if (heights[i].x > 0.001) layerCount++;
    }

    // 4. 从底层向上逐层绘制
    float cumHeight = 0.0;
    for (int i = 0; i < MAX_LAYERS; i++) {
        if (heights[i].x < 0.001) continue;
        cumHeight += heights[i].x;

        float alpha = drawWater(v_uv0, angle, cumHeight, layerCount, i);
        if (alpha > 0.0) {
            gl_FragColor = texColor * alpha * colors[i];
            return;
        }
    }

    // 5. 水面以上的瓶内空间 → 丢弃（透明）
    discard;
}
```

---

## 三、倾倒动画 — TypeScript 侧核心逻辑

### 3.1 角度同步

```typescript
// 每帧将瓶子节点的旋转角同步给 Shader
update() {
    if (this._waterMaterial && this.node.angle !== this._lastAngle) {
        this._lastAngle = this.node.angle;
        this._waterMaterial.setProperty('tiltAngle', this.node.angle);
    }
}
```

这是整个倾倒动画"丝滑"的核心：**瓶子旋转 → 角度实时传入 Shader → Shader 重算水面几何 → 每帧自动呈现正确的倾斜液面**。无需手动移动任何水层节点。

### 3.2 锚点技巧（绕瓶口旋转）

倾倒前将瓶子节点的锚点设置到瓶口位置，使旋转看起来像是绕瓶口倾斜：

```typescript
setPourAnchor(isRight: boolean) {
    // 锚点设到瓶口附近（靠上，偏左或偏右）
    const anchorX = isRight ? (width - 3) / width : 3 / width;
    const anchorY = (height - 2) / height;

    // 修改锚点时需补偿位置偏移，保持视觉位置不变
    const oldAnchor = node.getAnchorPoint();
    const offset = new Vec2(
        (anchorX - oldAnchor.x) * width,
        (anchorY - oldAnchor.y) * height
    );
    // 旋转补偿（如果已有角度）
    const rotatedOffset = rotateVec2(offset, node.angle);
    node.position += rotatedOffset;

    // 同时反向移动水节点，抵消锚点变化对子节点的影响
    waterNode.position -= new Vec2(
        (anchorX - oldAnchor.x) * width,
        (anchorY - oldAnchor.y) * height
    );

    node.setAnchorPoint(anchorX, anchorY);
}
```

### 3.3 倾倒临界角度计算

根据当前水量计算"水刚好到达瓶口"的临界角度：

```typescript
// ratio = 节点高度 / 节点宽度
getCriticalAngle(waterHeight: number): number {
    if (waterHeight <= 0) return 90;

    let radians: number;
    if (waterHeight < 0.5) {
        // 水少，倾斜时先碰到瓶底
        radians = Math.atan(ratio / (waterHeight * 2.0));
    } else {
        // 水多，倾斜时先碰到瓶口
        radians = Math.atan(2.0 * ratio * (1.0 - waterHeight));
    }
    return radians * 180 / Math.PI;
}
```

- **startAngle** = `getCriticalAngle(当前总水面高度)` → 倾斜到此角度时水到达瓶口，开始流出
- **endAngle** = `getCriticalAngle(倒完目标颜色后的水面高度)` → 倾斜到此角度时该颜色恰好倒完

### 3.4 倾倒动画时间线

```
Phase 1: 移动 + 倾斜到 startAngle（水到达瓶口）
    tween(node).to(moveTime, { position: targetPos, angle: startAngle })

Phase 2: 继续倾斜到 endAngle（目标颜色倒完）
    tween(node).to(pourTime, { angle: endAngle })
    同时：
    - 源瓶 Water 的 action = PourAction.out，update() 中逐帧减少顶层 height
    - 目标瓶 Water 的 action = PourAction.in，update() 中逐帧增加新层 height
    - 播放水流线动画（Graphics 画线从源瓶口到目标瓶口）

Phase 3: 回位
    tween(node).to(moveTime, { position: originalPos, angle: 0 })
    恢复锚点为 (0.5, 0.5)
```

### 3.5 源瓶水量递减 / 目标瓶水量递增

```typescript
// 每帧调用（在 update 中）
// 倒出：顶层 height 逐渐减少
downHeight() {
    const info = this.infos[this.currentIndex];
    info.height -= ANGLE_FACTOR;  // 0.01 per frame
    if (info.height <= targetHeight) {
        info.height = targetHeight;
        if (targetHeight <= 0) {
            this.infos.pop();  // 移除空层
        }
        this.action = PourAction.none;
    }
    this.syncToShader();  // 更新 heights uniform
}

// 倒入：新层 height 逐渐增加
upHeight() {
    const info = this.infos[this.currentIndex];
    info.height += ANGLE_FACTOR;
    if (info.height >= targetHeight) {
        info.height = targetHeight;
        this.action = PourAction.none;
    }
    this.syncToShader();
}
```

---

## 四、Cocos 3.x Effect 语法模板

### 4.1 与 2.x 的关键差异

| 特性 | Cocos 2.x | Cocos 3.x |
|------|-----------|-----------|
| Effect 格式 | `CCEffect %{ }%` + `CCProgram` | 相同格式，但 include 路径不同 |
| 内置头文件 | `#include <cc-global>` | `#include <builtin/uniforms/cc-global>` |
| 时间变量 | `cc_time.x` | `cc_time.x`（相同） |
| 纹理采样 | `texture(texture, uv)` | `texture(mainTexture, uv)` 或自定义 |
| Uniform 声明 | `uniform Properties { ... }` | `uniform Constant { ... }`（自定义名称） |
| 顶点输入 | `in vec3 a_position` | `in vec3 a_position`（相同） |
| 片元输出 | `gl_FragColor = ...` | 需用 `layout(location=0) out vec4 fragColor;` 或 `gl_FragColor`（兼容模式） |
| 精度声明 | `precision highp float;` | 可省略（3.x 默认 highp） |
| SpriteFrame 支持 | 手动处理 UV | 需 `#include <builtin/internal/sprite-fs>` 或手动处理 sliced/trimmed |

### 4.2 Cocos 3.x Effect 骨架

```glsl
CCEffect %{
  techniques:
  - name: transparent
    passes:
    - vert: sprite-vs:vert
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
        mainTexture:    { value: white }
        colors:         { value: [1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0] }
        heights:        { value: [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0] }
        resolution:     { value: [1, 1] }
        tiltAngle:      { value: 0 }
        waveType:       { value: 0 }
}%

CCProgram sprite-vs %{
  precision highp float;
  #include <builtin/uniforms/cc-global>

  in vec3 a_position;
  in vec2 a_texCoord;
  in vec4 a_color;

  out vec2 v_uv;
  out vec4 v_color;

  vec4 vert() {
    vec4 pos = vec4(a_position, 1.0);
    pos = cc_matViewProj * pos;
    v_uv = a_texCoord;
    v_color = a_color;
    return pos;
  }
}%

CCProgram liquid-fs %{
  precision highp float;
  #include <builtin/uniforms/cc-global>

  in vec2 v_uv;
  in vec4 v_color;

  #define PI 3.14159265358979
  #define MAX_LAYERS 6

  uniform sampler2D mainTexture;

  uniform LiquidParams {
    vec4 colors[MAX_LAYERS];
    vec4 heights[MAX_LAYERS];
    vec2 resolution;
    float tiltAngle;
    float waveType;
  };

  // ---- 旋转函数 ----
  vec2 rotatePt(vec2 uv, float angle, vec2 center) {
    float c = cos(angle);
    float s = sin(angle);
    vec2 d = uv - center;
    return vec2(c * d.x - s * d.y, s * d.x + c * d.y) + center;
  }

  // ---- 核心：绘制某一水面高度的液体 ----
  float drawWater(vec2 uv, float angle, float _height, int arrSize, int curIdx) {
    float ratio = resolution.y / resolution.x;
    bool toLeft = sin(angle) >= 0.0;
    vec2 center = vec2(0.5, 1.0 - _height);

    float _t = abs(tan(angle));

    if (_height < 0.5) {
      bool isBottom = _t / ratio > 2.0 * _height;
      if (isBottom) {
        center.x = sqrt(2.0 * _height / _t * ratio) / 2.0;
        center.y = 1.0 - sqrt(2.0 * _height * _t / ratio) / 2.0;
        bool isTop = _t > ratio / (_height * 2.0);
        if (isTop) {
          center.y = 0.5;
          center.x = _height;
        }
      }
      if (!toLeft) {
        center.x = 1.0 - center.x;
      }
    } else {
      bool isTop = _t > 2.0 * ratio * (1.0 - _height);
      if (isTop) {
        center.x = sqrt(2.0 * ratio * (1.0 - _height) / _t) / 2.0;
        center.y = sqrt(2.0 * ratio * (1.0 - _height) * _t) / 2.0 / ratio;
        bool isBottom = _t > ratio / (2.0 * (1.0 - _height));
        if (isBottom) {
          center.y = 0.5;
          center.x = 1.0 - _height;
        }
      }
      if (toLeft) {
        center.x = 1.0 - center.x;
      }
    }

    uv.y = uv.y * ratio;
    uv -= vec2(center.x, center.y * ratio);
    vec2 uv1 = rotatePt(uv, angle, vec2(0.0));

    float y = 0.0;
    bool isTopLayer = (curIdx == arrSize - 1);
    if (isTopLayer) {
      float amplitude = 0.0;
      float omega = 0.0;
      float freq = 0.0;
      if (abs(waveType - 1.0) < 0.01) {        // 加水波纹
        amplitude = 0.08; omega = 10.0; freq = 10.0;
      } else if (abs(waveType - 2.0) < 0.01) {  // 倒水波纹
        amplitude = 0.03; omega = 5.0; freq = 6.0;
      }
      y = amplitude * sin(omega * uv1.x + freq * cc_time.x * (toLeft ? 1.0 : -1.0));
    }

    return (uv1.y > y) ? 1.0 : 0.0;
  }

  vec4 frag() {
    vec4 texColor = texture(mainTexture, v_uv);

    // 瓶外透明区域直接丢弃 → 无毛边
    if (texColor.a < 0.01) discard;

    float angle = mod(tiltAngle, 360.0) * PI / 180.0;

    int size = 0;
    for (int i = 0; i < MAX_LAYERS; i++) {
      if (heights[i].x > 0.001) size++;
    }

    float cumHeight = 0.0;
    for (int i = 0; i < MAX_LAYERS; i++) {
      if (heights[i].x < 0.001) continue;
      cumHeight += heights[i].x;
      float a = drawWater(v_uv, angle, cumHeight, size, i);
      if (a > 0.0) {
        return v_color * a * colors[i];
      }
    }

    discard;
    return vec4(0.0);
  }
}%
```

> **注意**：以上 Effect 为基于原理推导的 Cocos 3.x 语法骨架。实际使用时需要：
> 1. 在 Cocos Creator 编辑器中创建 `.effect` 文件，粘贴内容
> 2. 创建 Material 并选择此 Effect
> 3. 将 Material 赋给水节点的 Sprite 组件
> 4. 确认顶点着色器的输入属性名与 Cocos 3.x Sprite 组件输出一致（`a_position`, `a_texCoord`, `a_color`）

### 4.3 Cocos 3.x 顶点着色器注意事项

Cocos 3.x 的 Sprite 组件使用 `a_texCoord` 而非 `a_uv0`。如果遇到 UV 问题，可使用内置的 sprite 顶点着色器：

```glsl
// 方法一：使用内置 sprite-vs（推荐，最省事）
// 在 CCEffect 的 vert 字段写：sprite-vs:vert
// 然后在片元中使用 v_uv0

// 方法二：自己写（如上面的骨架）
// 注意输入属性名必须是 a_texCoord（不是 a_uv0）
```

若使用内置 `sprite-vs`，片元着色器中的 UV 变量名为 `v_uv0`，颜色为 `v_color`。

---

## 五、TypeScript 材质对接（Cocos 3.x）

### 5.1 材质属性设置

```typescript
import { Material, Sprite, Vec2, Color } from 'cc';

// 获取材质（假设已在编辑器中赋好 Effect）
const sprite = waterNode.getComponent(Sprite)!;
const material = sprite.getSharedMaterial(0)!; // 或 getMaterial(0) 获取实例

// 设置分辨率
material.setProperty('resolution', new Vec2(nodeWidth, nodeHeight));

// 设置颜色数组（Float32Array，每层 4 个分量 RGBA）
const colorsData = new Float32Array(MAX_LAYERS * 4);
for (let i = 0; i < waterInfos.length; i++) {
    const c = waterInfos[i].color;
    colorsData[i * 4 + 0] = c.r / 255;
    colorsData[i * 4 + 1] = c.g / 255;
    colorsData[i * 4 + 2] = c.b / 255;
    colorsData[i * 4 + 3] = 1.0;
}
material.setProperty('colors', colorsData);

// 设置高度数组（Float32Array，每层高度存在每 4 个分量的第 1 个）
const heightsData = new Float32Array(MAX_LAYERS * 4);
for (let i = 0; i < waterInfos.length; i++) {
    heightsData[i * 4] = waterInfos[i].height;
}
material.setProperty('heights', heightsData);

// 设置倾斜角度（每帧更新）
material.setProperty('tiltAngle', this.node.angle);

// 设置波纹类型
material.setProperty('waveType', 0); // 0=无, 1=加水, 2=倒水
```

### 5.2 Cocos 3.x 的 setProperty 注意事项

- `vec4[N]` 数组需传 `Float32Array(N * 4)`
- `vec2` 可传 `Vec2` 对象或 `Float32Array(2)`
- `float` 直接传 `number`
- 若用 `getSharedMaterial()` 修改，会影响所有共享该材质的 Sprite；多个瓶子应各自 `getMaterialInstance(0)` 获取独立实例
- **Cocos 3.x 中如果 `setProperty` 不生效**，检查 Effect 中 properties 声明的 key 是否一致，以及类型是否匹配

---

## 六、水流线动画（Graphics 画线）

水流线是独立于 Shader 的简单动画，用 `Graphics` 组件在瓶子外部画一条从源瓶口到目标瓶口的线：

```typescript
// 水流节点放在瓶子的共同父节点上
const flowGraphics = flowNode.getComponent(Graphics)!;
flowGraphics.lineWidth = 6;
flowGraphics.lineCap = Graphics.LineCap.ROUND;  // 圆头，更自然
flowGraphics.strokeColor = pourColor;

// 用 tween 插值终点位置
tween({ progress: 0 })
    .to(duration, { progress: 1 }, {
        onUpdate: (target) => {
            const p = target.progress;
            const currentEnd = Vec2.lerp(new Vec2(), fromPt, toPt, p);
            flowGraphics.clear();
            flowGraphics.moveTo(fromPt.x, fromPt.y);
            flowGraphics.lineTo(currentEnd.x, currentEnd.y);
            flowGraphics.stroke();
        }
    })
    .call(() => flowGraphics.clear())
    .start();
```

---

## 七、完整倾倒流程伪代码

```typescript
async pourFromTo(srcBottle, dstBottle, pourCount, colorId) {
    // 1. 计算方向
    const isRight = dstBottle.worldX > screenCenter.x;

    // 2. 源瓶设置锚点到瓶口
    srcBottle.setPourAnchor(isRight);

    // 3. 计算倾倒角度
    const startAngle = srcBottle.water.getPourStartAngle(); // 水到瓶口
    const endAngle   = srcBottle.water.getPourEndAngle();   // 该颜色倒完
    const signedStart = isRight ? -startAngle : startAngle;
    const signedEnd   = isRight ? -endAngle : endAngle;

    // 4. 计算目标位置（瓶口对准目标瓶口上方）
    const targetPos = calcPourPosition(srcBottle, dstBottle);

    // 5. Phase 1: 移动并倾斜到 startAngle
    srcBottle.water.setAction(PourAction.out, pourCount);
    await tweenTo(srcBottle.node, moveTime, {
        position: targetPos,
        angle: signedStart
    });

    // 6. Phase 2: 继续倾斜到 endAngle + 同时播放水流线
    //    源瓶 Water.update() 自动逐帧减 height
    //    目标瓶调用 addWater(colorId, pourCount) 开始逐帧增 height
    dstBottle.water.addInfo({ colorId, height: pourHeight, color });
    playFlowAnimation(srcBottle, dstBottle, color, pourTime);
    await tweenTo(srcBottle.node, pourTime, { angle: signedEnd });

    // 7. Phase 3: 收尾水流 + 源瓶回位
    playTailFlow(srcBottle, dstBottle);
    srcBottle.resetAnchor();
    await tweenTo(srcBottle.node, moveTime, {
        position: originalPos,
        angle: 0
    });
}
```

---

## 八、实现检查清单

- [ ] 创建 `water-sort-liquid.effect` 文件（基于第四节模板）
- [ ] 在编辑器中创建 Material，选择该 Effect
- [ ] 创建 `WaterRenderer.ts` 组件（管理材质属性、倾斜角同步、水层增减）
- [ ] 修改 `BottleComponent.ts`：
  - [ ] 移除 Graphics 水层节点，改为单个 Sprite + 自定义材质
  - [ ] `renderWaterLayers()` 改为设置材质 uniform
  - [ ] `update()` 中同步 `node.angle → tiltAngle`
  - [ ] 倒水动画改为锚点+角度驱动
- [ ] 水流线动画（Graphics 画线，可保留现有 `_streamNode` 逻辑，改为圆头线帽）
- [ ] 测试：静态多色层显示、倾斜液面、倾倒流程

九、Cocos 3.8.x 踩坑与语法不兼容补充（极其重要）
在将 2.x 的 Shader 移植到 3.8.x 时，由于引擎底层渲染 API 全面升级（拥抱 Vulkan/Metal/WebGPU 等），会遇到非常严格的语法与编译检查。请务必避开以下三大核心"坑点"：
9.1 面板 properties 禁止定义大数组（错误：EFX3302）
【现象】
如果你按照 2.x 的习惯，在顶部的 CCEffect %{ properties: ... }% 中写了类似 colors: { value:[1,1,1,1, 0,0...共24个数字] }，控制台会立刻报错：
Error EFX3302: illegal property declaration for 'colors': wrong array length
【原因与解法】
3.8.x 的 YAML 解析器会严格校验基类型长度。它认为 colors 是一个 vec4，最多只能接受 4 个数字的默认值。且目前的 Cocos 材质面板根本不支持在编辑器 UI 中配置数组。
正确做法：直接将 colors 和 heights 这类数组从 YAML 的 properties 块中完全删除！只在 GLSL 的 UBO 中声明它们，然后在 TypeScript 脚本中通过 material.setProperty('colors', new Float32Array(...)) 进行动态赋值。
9.2 UBO 内存对齐规则：禁止使用小于 vec4 的数组
【现象】
如果在着色器中声明 float heights[24];，可能会导致渲染崩溃、报错或传参彻底失效。
【原因与解法】
为了适配现代图形 API 严格的内存对齐要求，3.x 规定 UBO（Uniform Block）内的数组元素尺寸绝对不能小于 vec4。
错误写法：float heights[24]; （元素是 float，太小了）
正确做法（数据打包）：必须压缩成 vec4 heights[6];，并在片元着色器中通过 heights[i / 4][i % 4] 来解析读取，或者像本文前面的逻辑一样，规定每个 vec4 的 .x 分量代表高度。
9.3 死代码消除导致属性丢失（警告：illegal property name）
【现象】
在 TS 中调用 material.setProperty('tiltAngle', angle) 时，控制台疯狂输出：
installHook.js:1 illegal property name: tiltAngle.
installHook.js:1 illegal property name: resolution.
【原因与解法】
GLSL 编译器非常激进，被称为死代码消除（Dead Code Elimination）。如果你在 Shader 的 UBO 中声明了 tiltAngle，但在 main() / frag() 函数的核心计算中没有真正用到它（比如开发初期仅仅只是声明了还没写逻辑），编译器就会直接把这个变量删掉。此时引擎去给它赋值就会报“找不到该属性”。
正确做法：确保声明的变量在最终颜色计算中被使用。如果处于开发调试阶段，可以写一段"废代码"骗过编译器：
code
Glsl
// 骗过编译器的防优化占位符代码
float dummy = resolution.x + tiltAngle + float(waveType) + colors[0].r + heights[0].x;
texColor.r += dummy * 0.000001; // 极小值不影响视觉，但保住了变量不被删
9.4 全局 Uniform 必须包裹在 UBO 中
【现象】
2.x 中随处可见的全局浮空 uniform float tiltAngle; 在 3.x 中会报错或失效。
【原因与解法】
3.x 强制要求所有的自定义 Uniform 变量必须被放在一个显式命名的常量块（Uniform Buffer Object）中。
正确规范：
code
Glsl
// 必须包裹在 UBO 中，且注意 vec4 放前面，float 放后面的对齐习惯
uniform LiquidParams {
  vec4 colors[MAX_LAYERS];
  vec4 heights[MAX_LAYERS];
  vec2 resolution;
  float tiltAngle;
  float waveType;
};
(注：请同步检查本文【4.2】节的 Effect 模板，在实际应用时，记得将 properties 块中的 colors 和 heights 删去，以免触发 EFX3302 报错。)