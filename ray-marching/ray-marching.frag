#version 130

const vec3 COLOR_RED = vec3(1, 0, 0);
const vec3 COLOR_GREEN = vec3(0, 1, 0);
const vec3 COLOR_BLUE = vec3(0, 0, 1);
const vec3 COLOR_BLACK = vec3(0, 0, 0);
const vec3 COLOR_WHITE = vec3(1, 1, 1);
const vec3 COLOR_YELLOW = vec3(1, 1, 0);
const vec3 COLOR_PINK = vec3(1, 0, 1);

const float EPS = 0.00001;
const float NEAR = 0.1;
const float FAR = 10000;
const float SCENE_RADIUS = 40;

uniform float time;
uniform vec3 eye;
uniform vec3 eyeDir;
uniform int maxSteps;
uniform int maxReflect;
uniform sampler2D sampler[6];

in vec2 fragCoord;

struct MarchResult {
    float dist;
    vec3 color;
    float reflect;
    bool lighted;
};

MarchResult cube(vec3 p, vec3 pos, float r, vec3 color, float reflect) {
    vec3 d = abs(p - pos) - r;
    return MarchResult(min(max(max(d.x, d.y), d.z), 0.0) + length(max(d, 0.0)), color, reflect, true);
}

MarchResult cylinder(vec3 p, vec3 pos, float h, float r, vec3 color, float reflect) {
    p -= pos;
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(h, r);
    return MarchResult(min(max(d.x, d.y), 0.0) + length(max(d, 0.0)), color, reflect, true);
}

MarchResult sphere(vec3 p, vec3 pos, float r, vec3 color, float reflect) {
    return MarchResult(length(p - pos) - r, color, reflect, true);
}

MarchResult torus(vec3 p, vec3 pos, float r1, float r2, vec3 color, float reflect) {
    p -= pos;
    vec2 q = vec2(length(p.xz) - r2, p.y);
    return MarchResult(length(q) - r1, color, reflect, true);
}

MarchResult plane(vec3 p, vec3 pos, vec3 n, vec3 color, float reflect) {
    return MarchResult(dot(p - pos, n), color, reflect, true);
}

float jump(float x) {
    return (0.25 - pow((x - 0.5), 2)) * 4;
}

float sawtooth(float x) {
    return mod(x, 1.0);
}

MarchResult intersect(MarchResult a, MarchResult b) {
    return a.dist > b.dist ? a : b;
}

MarchResult unite(MarchResult a, MarchResult b) {
    return a.dist < b.dist ? a : b;
}

MarchResult subtract(MarchResult a, MarchResult b) {
    b.dist *= -1;
    return intersect(a, b);
}

MarchResult unite_smooth(MarchResult a, MarchResult b, float k) {
    float h = clamp(0.5 + 0.5 * (b.dist - a.dist) / k, 0.0, 1.0);
    return MarchResult(mix(b.dist, a.dist, h) - k * h * (1.0 - h), mix(b.color, a.color, h) - k * h * (1.0 - h), 0, true);
}

MarchResult intersect_smooth(MarchResult a, MarchResult b, float k) {
    float h = clamp(0.5 + 0.5 * (b.dist - a.dist) / k, 0.0, 1.0);
    return MarchResult(mix(a.dist, b.dist, h) + k * h * (1.0 - h), mix(a.color, b.color, h) + k * h * (1.0 - h), 0, true);
}

MarchResult subtract_smooth(MarchResult a, MarchResult b, float k) {
    b.dist *= -1;
    return intersect_smooth(a, b, k);
}

MarchResult old_scene(vec3 p) {
    return unite(
        unite(
            cube(p, vec3(-2, 0, 0), 0.5, COLOR_WHITE, 0),
            cylinder(p, vec3(-2, 1 + jump(sawtooth(time / 1.5)), 0), 0.5, 0.5, COLOR_BLUE, 0)
        ),
        unite(
            sphere(p, vec3(sin(time), cos(time), 0), 0.4, COLOR_WHITE, 0),
            torus(p, vec3(1, 0, 0), 0.5, 1.0, COLOR_WHITE, 0)
        )
    );
}

MarchResult simple_csg(vec3 p, float reflect) {
    vec3 pos = vec3(0, -1, 15);
    vec3 offset = vec3(0, 0, 0.5);
    return unite(
        subtract(
            intersect(cube(p, pos, 0.5, COLOR_WHITE, reflect), sphere(p, pos, 0.7, COLOR_RED, reflect)),
            cylinder(p, pos, 0.2, 0.6, COLOR_GREEN, reflect)
        ),
        unite(sphere(p, pos + offset, 0.25, COLOR_BLUE, reflect), sphere(p, pos - offset, 0.25, COLOR_BLUE, reflect))
    );
}

MarchResult smooth_csg(vec3 p) {
    vec3 pos = vec3(-2, 0, 4);
    vec3 offset = vec3(0.5, 0, 0);
    float k = (1 + sin(time)) * 0.1;
    return unite_smooth(
        subtract_smooth(
            intersect_smooth(cube(p, pos, 0.5, COLOR_WHITE, 0), sphere(p, pos, 0.7, COLOR_RED, 0), k),
            cylinder(p, pos, 0.2, 0.6, COLOR_GREEN, 0),
            k
        ),
        unite_smooth(
            sphere(p, pos + offset, 0.25, COLOR_BLUE, 0),
            sphere(p, pos - offset, 0.25, COLOR_BLUE, 0),
            k
        ),
        k
    );
}

MarchResult reflecting_figures(vec3 p) {
    MarchResult cubes = unite(
        unite(
            cube(p, vec3(-7, 0, 1.5), 3, COLOR_WHITE, 0.5),
            cube(p, vec3(7, 0, 5.5), 3, COLOR_WHITE, 0.5)
        ),
        unite(
           cube(p, vec3(-7, 0, 9.5), 3, COLOR_WHITE, 0.5),
           cube(p, vec3(7, 0, 13.5), 3, COLOR_WHITE, 0.5)
        )
    );
    return unite(cubes, sphere(p, vec3(-3, 4, 5.5), 1, COLOR_PINK, 0.2));
}

MarchResult bounding_cube(vec3 p) {
    vec3 d = abs(p) - SCENE_RADIUS;
    return MarchResult(-min(max(max(d.x, d.y), d.z), 0.0) - length(max(d, 0.0)), COLOR_BLACK, 0, false);
}

MarchResult scene(vec3 p) {
    MarchResult old = old_scene(p);
    MarchResult simple = simple_csg(p, 0.5);
    MarchResult smth = smooth_csg(p);
    MarchResult ref = reflecting_figures(p);

    return unite(unite(unite(simple, smth), unite(old, ref)), bounding_cube(p));
//    return unite(simple, bounding_cube(p));
}

MarchResult ray_marching(vec3 eye, vec3 dir) {
    float depth = NEAR;
    for (int i = 0; i < maxSteps; ++i) {
        MarchResult marchResult = scene(eye + depth * dir);
        if (marchResult.dist < EPS) {
            return MarchResult(depth, marchResult.color, marchResult.reflect, marchResult.lighted);
        }
        depth += marchResult.dist;
        if (depth >= FAR) {
            return MarchResult(FAR, COLOR_BLACK, 0, false);
        }
    }
    return MarchResult(FAR, COLOR_BLACK, 0, false);
}

vec3 get_normal(vec3 p) {
    return normalize(vec3(
        scene(vec3(p.x + EPS, p.y, p.z)).dist - scene(vec3(p.x - EPS, p.y, p.z)).dist,
        scene(vec3(p.x, p.y + EPS, p.z)).dist - scene(vec3(p.x, p.y - EPS, p.z)).dist,
        scene(vec3(p.x, p.y, p.z  + EPS)).dist - scene(vec3(p.x, p.y, p.z - EPS)).dist
    ));
}

vec3 get_color(vec3 p) {
    if (abs(p.z - SCENE_RADIUS) < EPS) {
        return texture(sampler[1], p.xy / (2.0 * SCENE_RADIUS) + vec2(0.5, 0.5)).rgb;
    }
    if (abs(p.y - SCENE_RADIUS) < EPS) {
        return texture(sampler[5], p.zx / (2.0 * SCENE_RADIUS) + vec2(0.5, 0.5)).rgb;
    }
    if (abs(p.x - SCENE_RADIUS) < EPS) {
        return texture(sampler[2], p.zy / (2.0 * SCENE_RADIUS) + vec2(0.5, 0.5)).rgb;
    }
    if (abs(p.z + SCENE_RADIUS) < EPS) {
        return texture(sampler[3], p.xy / (2.0 * SCENE_RADIUS) + vec2(0.5, 0.5)).rgb;
    }
    if (abs(p.y + SCENE_RADIUS) < EPS) {
        return texture(sampler[4], p.zx / (2.0 * SCENE_RADIUS) + vec2(0.5, 0.5)).rgb;
    }
    if (abs(p.x + SCENE_RADIUS) < EPS) {
        return texture(sampler[0], p.zy / (2.0 * SCENE_RADIUS) + vec2(0.5, 0.5)).rgb;
    }
    return COLOR_PINK;
}

void main() {
    vec3 side = cross(eyeDir, vec3(0, 1, 0));
    vec3 up = cross(side, eyeDir);
    vec3 origin = eye;
    vec3 ray = normalize(eyeDir + side * fragCoord.x + up * fragCoord.y);

    float reflect_cft = 1.0;
    vec3 color = COLOR_BLACK;

    for (int i = 0; i < maxReflect + 1; ++i) {
        MarchResult marchResult = ray_marching(origin, ray);
        if (marchResult.dist < FAR) {
            if (marchResult.lighted){
                vec3 normal = get_normal(origin + ray * marchResult.dist);
                float light = 0.3 + 0.4 * dot(normal, -ray) + 0.3 * dot(normal, normalize(vec3(1, 1, 1)));
                color += marchResult.color * light * reflect_cft * (1 - marchResult.reflect);
                reflect_cft *= marchResult.reflect;
            } else {
                color += get_color(origin + ray * marchResult.dist) * reflect_cft;
            }
        }
        if (marchResult.dist < FAR && marchResult.reflect > 0) {
            origin = origin + ray * marchResult.dist;
            ray = reflect(ray, get_normal(origin));
        } else {
            break;
        }
    }
//    gl_FragColor = texture(sampler, fragCoord.xy);
    gl_FragColor = vec4(color, 1);
}
