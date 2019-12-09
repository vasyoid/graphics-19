#version 130

uniform vec2 viewPortSize;

out vec3 position;

void main() {
    gl_Position = ftransform();
    float ratio = viewPortSize.x / viewPortSize.y;
    position = vec3(gl_Position.x * ratio, gl_Position.y, 1);
}
