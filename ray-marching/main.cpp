#include <GL/glew.h>
#include <GL/glut.h>
#include <fstream>
#include <vector>

GLint viewPortSize_loc;
GLint timer_loc;

void idle() {
    glUniform1f(timer_loc, glutGet(GLUT_ELAPSED_TIME) / 1000.0f);
//    printf("uniform[%i] = %f\n", timer_loc, glutGet(GLUT_ELAPSED_TIME) / 100.0f);
}

void reshape(int width, int height) {
    glViewport(0, 0, width, height);
    glUniform2f(viewPortSize_loc, width, height);
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
    timer_loc = glGetUniformLocation(program, "myTimer");
}

int main(int argc, char **argv) {
    init(argc, argv);
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutIdleFunc(idle);
    glutMainLoop();
}