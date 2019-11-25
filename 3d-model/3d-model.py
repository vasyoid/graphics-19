import time
from math import sin, cos

import noise
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

    vertices = [mesh.vertices[ind] for ind in mesh.vertex_indices]

    if mesh.normals:
        normals = [mesh.normals[ind] for ind in mesh.normal_indices]
    else:
        normals = []
        for i in range(0, len(vertices), 3):
            mat = [vertices[i + j].copy() for j in range(3)]
            ab = np.subtract(mat[1], mat[0])
            ac = np.subtract(mat[2], mat[0])
            normals.extend([list(normalize(np.cross(ab, ac)))] * 3)

    texture = [mesh.texture[ind] for ind in mesh.texture_indices] if mesh.texture else []

    return vertices, normals, texture


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


def init(vertices, texture_coords, normals):
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH)
    glutInitWindowSize(WINDOW_WIDTH, WINDOW_HEIGHT)
    glutInit(sys.argv)
    glutCreateWindow("3d-model")

    on_reshape(WINDOW_WIDTH, WINDOW_HEIGHT)
    glClearColor(*COLOR_BLACK)

    glEnable(GL_DEPTH_TEST)
    glEnableClientState(GL_NORMAL_ARRAY)
    glEnableClientState(GL_TEXTURE_COORD_ARRAY)
    glEnableClientState(GL_VERTEX_ARRAY)
    glVertexPointer(3, GL_FLOAT, 0, vertices)
    glNormalPointer(GL_FLOAT, 0, normals)

    program = create_program()

    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)

    glBindAttribLocation(program, 1, "texCoord")
    glEnableVertexAttribArray(1)
    glVertexAttribPointer(1, 2, GL_FLOAT, False, 0, texture_coords)
    tex_id = glGenTextures(1)
    glBindTexture(GL_TEXTURE_2D, tex_id)
    # noise_texture = [(i + j) / 512 for i in range(255) for j in range(255)]
    noise_texture = [noise.pnoise2(1 / 256 * i, 1 / 256 * j, octaves=10, repeatx=1, repeaty=1) for i in range(256) for j in range(256)]
    factor = max(noise_texture)
    noise_texture = [x / factor for x in noise_texture]
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RED, 256, 256, 0, GL_RED, GL_FLOAT, noise_texture)
    glGenerateMipmap(GL_TEXTURE_2D)

    glutDisplayFunc(on_draw_wrapper(len(vertices)))
    glutMouseFunc(on_mouse)
    glutMotionFunc(on_mouse_move)
    glutKeyboardFunc(on_key_press)
    lights_loc = glGetUniformLocation(program, "lights")
    threshold_loc = glGetUniformLocation(program, "threshold")
    glutIdleFunc(on_animate_wrapper(lights_loc, threshold_loc))
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
    lights = [
        (sin(t * 1) * 10,  cos(t * 1) * 10,  0,                1),
        (cos(t * 2) * 10,  0,                sin(t * 2) * 10,  1),
        (0,                sin(t * 3) * 10,  cos(t * 3) * 10,  1)
    ]
    glUniform4fv(lights_loc, 3, lights)


def animate_dissolve(threshold_loc):
    threshold = (sin(time.time() / 5) + 1.1) / 2
    glUniform1f(threshold_loc, threshold)


def on_animate_wrapper(lights_loc, threshold_loc):
    def on_animate():
        animate_dissolve(threshold_loc)
        animate_lights(lights_loc)
        glutPostRedisplay()
    return on_animate


def main():
    vertices, normals, texture = read_model("models/tree.obj")
    global prev_x, prev_y
    init(vertices, texture, normals)
    glutMainLoop()


if __name__ == "__main__":
    main()
