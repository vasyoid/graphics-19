#include <cmath>

#include <GL/glew.h>
#include <GL/glut.h>
#include <fstream>
#include <vector>
#include <iostream>

GLint viewPortSize_loc;
GLint timer_loc;
GLint eye_loc;
GLint eyeDir_loc;

float phi = 0;
float theta = -1;
float eye_x = 0;
float eye_y = 3;
float eye_z = 3;

void update_eye() {
    glUniform3f(eyeDir_loc, -std::sin(phi) * std::cos(theta), std::sin(theta), -std::cos(phi) * std::cos(theta));
    glUniform3f(eye_loc, eye_x, eye_y, eye_z);
}

void idle() {
    glUniform1f(timer_loc, glutGet(GLUT_ELAPSED_TIME) / 1000.0f);
}

void reshape(int width, int height) {
    glViewport(0, 0, width, height);
    glUniform2f(viewPortSize_loc, width, height);
}

void key_press(unsigned char key, int x, int y) {
    switch (key) {
        case 27:
            exit(0);
        case 'A':
        case 'a':
            eye_x -= 0.1 * std::cos(phi);
            eye_z += 0.1 * std::sin(phi);
            break;
        case 'D':
        case 'd':
            eye_x += 0.1 * std::cos(phi);
            eye_z -= 0.1 * std::sin(phi);
            break;
        case 'S':
        case 's':
            eye_x += 0.1 * std::sin(phi);
            eye_z += 0.1 * std::cos(phi);
            break;
        case 'W':
        case 'w':
            eye_x -= 0.1 * std::sin(phi);
            eye_z -= 0.1 * std::cos(phi);
            break;
        case 'Q':
        case 'q':
            eye_y += 0.1;
            break;
        case 'E':
        case 'e':
            eye_y -= 0.1;
            break;
        default:
            return;
    }
    update_eye();
}

void clamp(float &x, float min_x, float max_x) {
    x = std::max(min_x, std::min(x, max_x));
}

void special_key_press(int key, int x, int y) {
    switch (key) {
        case GLUT_KEY_LEFT:
            phi += 0.04;
            break;
        case GLUT_KEY_RIGHT:
            phi -= 0.04;
            break;
        case GLUT_KEY_DOWN:
            theta -= 0.02;
            break;
        case GLUT_KEY_UP:
            theta += 0.02;
            break;
        default:
            return;
    }

    clamp(theta, -1.5f, 1.5f);

    update_eye();
}

void display() {
    static float vertices[] = {-1, -1, 1, -1, -1, 1, 1, 1};
    glClear(GL_COLOR_BUFFER_BIT);
    glEnableClientState(GL_VERTEX_ARRAY);
    glVertexPointer(2, GL_FLOAT, 0, vertices);
    glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
    glDisableClientState(GL_VERTEX_ARRAY);
    glutSwapBuffers();
    glutPostRedisplay();
}

GLuint create_shader(GLenum shader_type, const char *filename) {
    std::ifstream input(filename);
    std::string source((std::istreambuf_iterator<char>(input)), std::istreambuf_iterator<char>());
    const GLchar *src = source.c_str();
    auto src_len = static_cast<GLint>(source.length());
    GLuint shader = glCreateShader(shader_type);
    glShaderSource(shader, 1, &src, &src_len);
    glCompileShader(shader);
    GLint status;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &status);
    if (!status) {
        GLchar buf[1024];
        GLsizei log_size;
        glGetShaderInfoLog(shader, 1024, &log_size, buf);
        fprintf(stderr, "Shader '%s' compile error: %s\n", filename, buf);
        fflush(stderr);
        exit(1);
    }
    return shader;
}

GLuint create_program() {
    GLuint vertex = create_shader(GL_VERTEX_SHADER, "ray-marching.vert");
    GLuint fragment = create_shader(GL_FRAGMENT_SHADER, "ray-marching.frag");
    GLuint program = glCreateProgram();
    glAttachShader(program, vertex);
    glAttachShader(program, fragment);
    glLinkProgram(program);
    glUseProgram(program);
    return program;
}

void init(int argc, char **argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB);
    glutInitWindowSize(1200, 800);
    glutCreateWindow("Ray marching");

    glClearColor(0, 0, 0, 1);
    glewInit();
    GLuint program = create_program();

    viewPortSize_loc = glGetUniformLocation(program, "viewPortSize");
    timer_loc = glGetUniformLocation(program, "time");
    eye_loc = glGetUniformLocation(program, "eye");
    eyeDir_loc = glGetUniformLocation(program, "eyeDir");
    update_eye();
}

int main(int argc, char **argv) {
    init(argc, argv);
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutIdleFunc(idle);
    glutKeyboardFunc(key_press);
    glutSpecialFunc(special_key_press);
    glutMainLoop();
}
