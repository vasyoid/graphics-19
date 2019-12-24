#include <cmath>

#include <GL/glew.h>
#include <GL/glut.h>
#include <fstream>
#include <vector>
#include <iostream>
#include "readpng.h"

GLint viewPortSize_loc;
GLint timer_loc;
GLint eye_loc;
GLint eyeDir_loc;
GLint maxSteps_loc;
GLint maxReflect_loc;

float phi = 0;
float theta = 0;
float eye_x = 0;
float eye_y = 0;
float eye_z = 18;
int max_steps = 200;
int max_reflect = 1;

int time_shift = 0;
int prev_time = -1;

void draw_info();

void update_eye() {
    glUniform3f(eyeDir_loc, -std::sin(phi) * std::cos(theta), std::sin(theta), -std::cos(phi) * std::cos(theta));
    glUniform3f(eye_loc, eye_x, eye_y, eye_z);
}

void update_max_steps() {
    glUniform1i(maxSteps_loc, max_steps);
}

void update_max_reflect() {
    glUniform1i(maxReflect_loc, max_reflect);
}

void idle() {
    if (prev_time < 0) {
        glUniform1f(timer_loc, (glutGet(GLUT_ELAPSED_TIME) + time_shift) / 1000.0f);
    }
}

void reshape(int width, int height) {
    glViewport(0, 0, width, height);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluOrtho2D(0, width, height, 0);
    glMatrixMode(GL_MODELVIEW);
    glUniform2f(viewPortSize_loc, width, height);
}

const int SCROLL_UP = 3;
const int SCROLL_DOWN = 4;

template<typename T>
void clamp(T &x, T min_x, T max_x) {
    x = std::max(min_x, std::min(x, max_x));
}

void mouse_press(int button, int state, int x, int y) {
    switch (button) {
        case SCROLL_UP:
            max_steps += 1;
            break;
        case SCROLL_DOWN:
            max_steps -= 1;
            break;
        default:
            return;
    }
    clamp(max_steps, 1, 1000);
    update_max_steps();
}

void key_press(unsigned char key, int x, int y) {
    switch (key) {
        case 32:
            if (prev_time < 0) {
                prev_time = glutGet(GLUT_ELAPSED_TIME);
            } else {
                time_shift += prev_time - glutGet(GLUT_ELAPSED_TIME);
                prev_time = -1;
            }
            break;
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
        case GLUT_KEY_PAGE_UP:
            max_reflect++;
            break;
        case GLUT_KEY_PAGE_DOWN:
            max_reflect--;
            break;
        default:
            return;
    }

    clamp(theta, -1.5f, 1.5f);
    clamp(max_reflect, 0, 20);

    update_max_reflect();
    update_eye();
}

void display() {
    static float vertices[] = {-1, -1, 1, -1, -1, 1, 1, 1};
    glClear(GL_COLOR_BUFFER_BIT);
    glEnableClientState(GL_VERTEX_ARRAY);
    glVertexPointer(2, GL_FLOAT, 0, vertices);
    glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
    glDisableClientState(GL_VERTEX_ARRAY);
    draw_info();
    glutSwapBuffers();
    glutPostRedisplay();
}

void draw_info() {
    std::string info[] = {
        "Max reflect: " + std::to_string(max_reflect),
        "Max steps: " + std::to_string(max_steps),
        "Camera position: (" + std::to_string(eye_x) + ", " + std::to_string(eye_y) + ", " + std::to_string(eye_z) +
        ")",
        "Pause animation: Space",
        "Change max steps: scroll up/down",
        "Move left/right: W A S D",
        "Move up/down: Q E",
        "Rotate camera: arrow buttons"
    };
    int x = 30;
    int y = 40;
    for (const std::string &str : info) {
        glRasterPos2f(x, y);
        for (const char &c : str) {
            glutBitmapCharacter(GLUT_BITMAP_TIMES_ROMAN_24, c);
        }
        y += 25;
    }
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

void load_texture(GLuint program) {


    GLenum textures[] = {
        GL_TEXTURE0,
        GL_TEXTURE1,
        GL_TEXTURE2,
        GL_TEXTURE3,
        GL_TEXTURE4,
        GL_TEXTURE5
    };

    for (int i = 0; i < 6; ++i) {
        glActiveTexture(textures[i]);
        GLuint tex;
        glGenTextures(1, &tex);
        glBindTexture(GL_TEXTURE_2D, tex);

        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);

        PngImage image = read_png_file(std::to_string(i) + ".png");

        glTexImage2D(
            GL_TEXTURE_2D,
            0,
            GL_RGB,
            static_cast<GLsizei>(image.width),
            static_cast<GLsizei>(image.height),
            0,
            GL_RGBA,
            GL_UNSIGNED_BYTE,
            image.data
        );

        delete[] image.data;

        GLenum err;

        while ((err = glGetError()) != GL_NO_ERROR) {
            fprintf(stderr, "OpenGL Error : %i , %s\n", err, gluErrorString(err));
        }
    }

    GLint sampler_loc = glGetUniformLocation(program, "sampler");
    int samplers[] = {0, 1, 2, 3, 4, 5};
    glUniform1iv(sampler_loc, 6, samplers);
}

void init(int argc, char **argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB);
    glutInitWindowSize(1200, 800);
    glutCreateWindow("Ray marching");

    glClearColor(0, 0, 0, 1);
    glColor3f(1, 0, 1);
    glewInit();
    GLuint program = create_program();

    load_texture(program);

    viewPortSize_loc = glGetUniformLocation(program, "viewPortSize");
    timer_loc = glGetUniformLocation(program, "time");
    eye_loc = glGetUniformLocation(program, "eye");
    eyeDir_loc = glGetUniformLocation(program, "eyeDir");
    maxSteps_loc = glGetUniformLocation(program, "maxSteps");
    maxReflect_loc = glGetUniformLocation(program, "maxReflect");
    update_eye();
    update_max_steps();
    update_max_reflect();
}

int main(int argc, char **argv) {
    init(argc, argv);
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutIdleFunc(idle);
    glutKeyboardFunc(key_press);
    glutSpecialFunc(special_key_press);
    glutMouseFunc(mouse_press);
    glutMainLoop();
}
