#version 130

uniform vec2 viewPortSize;

out vec2 fragCoord;

void main() {
    gl_Position = gl_Vertex;
    fragCoord = vec2(gl_Position.x * viewPortSize.x / viewPortSize.y, gl_Position.y);
}
