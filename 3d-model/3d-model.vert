#version 130

varying vec3 normal;
varying vec3 cameraPos;
varying vec4 vertexColor;

in vec2 texCoord;
out vec2 fragTexCoord;

void main() {
    cameraPos = normalize(vec3(gl_ModelViewMatrix * gl_Vertex));
    normal = normalize(gl_NormalMatrix * gl_Normal);
    gl_Position = ftransform();
    vertexColor = gl_Color;
    fragTexCoord = texCoord;
}
