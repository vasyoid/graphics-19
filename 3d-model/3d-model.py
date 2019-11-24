import itertools
import time
from math import sin, cos

import pygame
from pygame.locals import *

from OpenGL.GL import *
from OpenGL.GLU import *

import tinyobjloader
import numpy as np

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

SCROLL_UP = 5
SCROLL_DOWN = 4

COLOR_BLACK = (0, 0, 0, 0)


def group(iterator, count):
    itr = iter(iterator)
    while True:
        yield tuple([itr.__next__() for _ in range(count)])


def draw(vertices, normals, indices, n_indices):
    glBegin(GL_TRIANGLES)
    for inds, n_inds in zip(group(indices, 3), group(n_indices, 3)):
        for ind, n_ind in zip(inds, n_inds):
            glNormal3f(normals[3 * n_ind], normals[3 * n_ind + 1], normals[3 * n_ind + 2])
            glVertex3f(vertices[3 * ind], vertices[3 * ind + 1], vertices[3 * ind + 2])
    glEnd()


def normalize(v):
    norm = np.linalg.norm(v)
    if norm:
        v = np.divide(v, norm)
    return v


def read_model(filename):
    reader = tinyobjloader.ObjReader()

    # noinspection PyArgumentList
    if not reader.ParseFromFile(filename):
        print(f"Failed to load {filename}. Error: {reader.Error()}")

    attrib = reader.GetAttrib()
    vertices = attrib.vertices
    normals = attrib.normals

    indices = list(itertools.chain.from_iterable(
        [shape.mesh.indices for shape in reader.GetShapes()]
    ))
    vertex_indices = [ind.vertex_index for ind in indices]
    normal_indices = [ind.normal_index for ind in indices]

    if not attrib.normals:
        normals = []
        normal_indices = []
        for i, inds in enumerate(group(vertex_indices, 3)):
            mat = [[vertices[3 * ind + i] for i in range(3)] for ind in inds]
            ab = np.subtract(mat[1], mat[0])
            ac = np.subtract(mat[2], mat[0])
            normals.extend(normalize(np.cross(ab, ac)))
            normal_indices.extend([i, i, i])

    return vertices, normals, vertex_indices, normal_indices


def is_event_quit(event):
    is_key_esc = event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE
    return event.type == pygame.QUIT or is_key_esc


def redraw(vertices, normals, indices, n_indices):
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
    draw(vertices, normals, indices, n_indices)
    pygame.display.flip()


def update_lights(lights_loc):
    t = time.time()
    lights = [(sin(t * 2), cos(t * 2), 0, 1), (cos(t), 0, sin(t), 1), (0, sin(t * 3), cos(t * 3), 1)]
    glUniform4fv(lights_loc, 3, lights)


def main():
    init()
    program = create_program()
    lights_loc = glGetUniformLocation(program, "lights")
    animate_lights = True

    vertices, normals, indices, n_indices = read_model("models/bunny.obj")

    update_lights(lights_loc)
    redraw(vertices, normals, indices, n_indices)

    while True:
        need_redraw = animate_lights
        for event in pygame.event.get():
            if is_event_quit(event):
                pygame.quit()
                quit()
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == SCROLL_UP:
                    glScale(1 / ZOOM_FACTOR, 1 / ZOOM_FACTOR, 1 / ZOOM_FACTOR)
                elif event.button == SCROLL_DOWN:
                    glScale(ZOOM_FACTOR, ZOOM_FACTOR, ZOOM_FACTOR)
                need_redraw = True
            elif event.type == pygame.MOUSEMOTION and event.buttons[0]:
                glMatrixMode(GL_MODELVIEW)
                glRotate(ROTATION_FACTOR * event.rel[0], *UP_DIRECTION)
                model_view_matrix = glGetDoublev(GL_MODELVIEW_MATRIX)
                right = np.dot(model_view_matrix, RIGHT_DIRECTION_EXT)[:-1]
                glRotate(ROTATION_FACTOR * event.rel[1], *right)
                need_redraw = True
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                animate_lights ^= 1

        if animate_lights:
            update_lights(lights_loc)

        if need_redraw:
            redraw(vertices, normals, indices, n_indices)

        pygame.time.wait(10)


def init():
    pygame.init()
    pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT), DOUBLEBUF | OPENGL)

    glMatrixMode(GL_PROJECTION)
    gluPerspective(FIELD_OF_VIEW, WINDOW_WIDTH / WINDOW_HEIGHT, Z_NEAR, Z_FAR)
    gluLookAt(*CAMERA_POSITION, *SCENE_CENTER, *UP_DIRECTION)

    glClearColor(*COLOR_BLACK)
    glEnable(GL_DEPTH_TEST)


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


if __name__ == "__main__":
    main()
