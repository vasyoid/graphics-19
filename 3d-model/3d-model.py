import time
from math import sin, cos

import numpy as np
from OpenGL.GL import *
from OpenGL.GLU import *
from OpenGL.GLUT import *

import objloader

ESC_KEY = b'\x1b'

WINDOW_HEIGHT = 900
WINDOW_WIDTH = 1200
FIELD_OF_VIEW = 45
Z_NEAR = 0.1
Z_FAR = 50
SCENE_CENTER = (0, 0, 0)
UP_DIRECTION = (0, 1, 0)
RIGHT_DIRECTION_EXT = (1, 0, -1, 1)
CAMERA_POSITION = (2, 2, 2)

ZOOM_FACTOR = 1.1
ROTATION_FACTOR = 0.2

SCROLL_UP = 3
SCROLL_DOWN = 4

COLOR_BLACK = (0, 0, 0, 0)


def normalize(v):
    norm = np.linalg.norm(v)
    if norm:
        v = np.divide(v, norm)
    return v


def read_model(filename):
    mesh = objloader.load(filename)

    vertices = [[mesh.vertices[ind][j] for j in range(3)] for ind in mesh.vertex_indices]

    if mesh.normals:
        normals = [[mesh.normals[ind][j] for j in range(3)] for ind in mesh.normal_indices]
    else:
        normals = []
        for i in range(0, len(vertices), 3):
            mat = [vertices[i + j].copy() for j in range(3)]
            ab = np.subtract(mat[1], mat[0])
            ac = np.subtract(mat[2], mat[0])
            normals.extend([list(normalize(np.cross(ab, ac)))] * 3)

    return vertices, normals


def update_lights(lights_loc):
    t = time.time()
    lights = [
        [sin(t * 2), cos(t * 2), 0, 1],
        [cos(t), 0, sin(t), 1],
        [0, sin(t * 3), cos(t * 3), 1]
    ]
    glUniform4fv(lights_loc, 3, lights)


def create_shader(shader_type, filename):
    with open(filename) as file:
        source = "".join(file.readlines())
        shader = glCreateShader(shader_type)
        glShaderSource(shader, source)
        glCompileShader(shader)
        if not glGetShaderiv(shader, GL_COMPILE_STATUS):
            info = glGetShaderInfoLog(shader)
            print("Shader compile error:", info)
            exit(1)
        return shader


def create_program():
    vertex = create_shader(GL_VERTEX_SHADER, "3d-model.vert")
    fragment = create_shader(GL_FRAGMENT_SHADER, "3d-model.frag")
    program = glCreateProgram()
    glAttachShader(program, vertex)
    glAttachShader(program, fragment)
    glLinkProgram(program)
    glUseProgram(program)
    return program


def init(vertices, normals):
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH)
    glutInitWindowSize(WINDOW_WIDTH, WINDOW_HEIGHT)
    glutInit(sys.argv)
    glutCreateWindow("3d-model")

    on_reshape(WINDOW_WIDTH, WINDOW_HEIGHT)
    glClearColor(*COLOR_BLACK)

    glEnable(GL_DEPTH_TEST)
    glEnableClientState(GL_NORMAL_ARRAY)
    glEnableClientState(GL_VERTEX_ARRAY)
    glVertexPointer(3, GL_FLOAT, 0, vertices)
    glNormalPointer(GL_FLOAT, 0, normals)
    glColor3f(1, 1, 1)

    program = create_program()

    glutDisplayFunc(on_draw_wrapper(len(vertices)))
    glutMouseFunc(on_mouse)
    glutMotionFunc(on_mouse_move)
    glutKeyboardFunc(on_key_press)
    glutIdleFunc(on_animate_wrapper(glGetUniformLocation(program, "lights")))
    glutReshapeFunc(on_reshape)


def on_reshape(width, height):
    glMatrixMode(GL_PROJECTION)
    glLoadIdentity()
    glViewport(0, 0, width, height)
    gluPerspective(FIELD_OF_VIEW, width / height, Z_NEAR, Z_FAR)
    gluLookAt(*CAMERA_POSITION, *SCENE_CENTER, *UP_DIRECTION)


def on_draw_wrapper(n_verts):
    def on_draw():
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        glDrawArrays(GL_TRIANGLES, 0, n_verts)
        glutSwapBuffers()
    return on_draw


# noinspection PyUnusedLocal
def on_key_press(key, x, y):
    if key == ESC_KEY:
        exit(0)


def on_mouse(button, state, x, y):
    global prev_x, prev_y
    if button == GLUT_LEFT_BUTTON and state == GLUT_DOWN:
        prev_x = x
        prev_y = y
    else:
        prev_x = prev_y = -1
    if button == SCROLL_UP and state == GLUT_DOWN:
        glMatrixMode(GL_MODELVIEW)
        glScale(ZOOM_FACTOR, ZOOM_FACTOR, ZOOM_FACTOR)
        glutPostRedisplay()
    elif button == SCROLL_DOWN and state == GLUT_DOWN:
        glMatrixMode(GL_MODELVIEW)
        glScale(1 / ZOOM_FACTOR, 1 / ZOOM_FACTOR, 1 / ZOOM_FACTOR)
        glutPostRedisplay()


def rotate(dx, dy):
    glMatrixMode(GL_MODELVIEW)
    glRotate(ROTATION_FACTOR * dx, *UP_DIRECTION)
    model_view_matrix = glGetDoublev(GL_MODELVIEW_MATRIX)
    right = np.dot(model_view_matrix, RIGHT_DIRECTION_EXT)[:-1]
    glRotate(ROTATION_FACTOR * dy, *right)


def on_mouse_move(x, y):
    global prev_x, prev_y
    if prev_x >= 0 and prev_y >= 0:
        dx = x - prev_x
        dy = y - prev_y
        rotate(dx, dy)
        prev_x = x
        prev_y = y
        glutPostRedisplay()


def animate_lights(lights_loc):
    t = time.time()
    lights = [(sin(t * 2), cos(t * 2), 0, 1), (cos(t), 0, sin(t), 1), (0, sin(t * 3), cos(t * 3), 1)]
    glUniform4fv(lights_loc, 3, lights)


def on_animate_wrapper(lights_loc):
    def on_animate():
        animate_lights(lights_loc)
        glutPostRedisplay()
    return on_animate


def main():
    vertices, normals = read_model("models/tree.obj")
    global prev_x, prev_y
    init(vertices, normals)
    glutMainLoop()


if __name__ == "__main__":
    main()
