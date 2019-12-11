#include <cmath>

#include <GL/glew.h>
#include <GL/glut.h>
#include <fstream>
#include <vector>
#include <iostream>

GLint viewPortSize_loc;
GLint timer_loc;
GLint eye_loc;

void update_eye(float phi, float theta, float distance) {
    glUniform3f(eye_loc, std::sin(phi) * distance, std::sin(theta) * distance, std::cos(phi) * distance);
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
        default:
            return;
    }
}

void clamp(float &x, float min_x, float max_x) {
    x = std::max(min_x, std::min(x, max_x));
}

void special_key_press(int key, int x, int y) {
    static float distance = 4;
    static float phi = 0;
    static float theta = 1;

    switch (key) {
        case GLUT_KEY_LEFT:
            phi -= 0.04;
            break;
        case GLUT_KEY_RIGHT:
            phi += 0.04;
            break;
        case GLUT_KEY_DOWN:
            theta -= 0.04;
            break;
        case GLUT_KEY_UP:
            theta += 0.04;
            break;
        case GLUT_KEY_PAGE_DOWN:
            distance += 0.04;
            break;
        case GLUT_KEY_PAGE_UP:
            distance -= 0.04;
            break;
        default:
            return;
    }

    clamp(theta, -1, 1);
    clamp(distance, 2, 10);

    update_eye(phi, theta, distance);
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
    update_eye(0, 1, 4);
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
