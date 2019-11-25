class Mesh:

    def __init__(self):
        self.vertices = []
        self.texture = []
        self.normals = []
        self.vertex_indices = []
        self.texture_indices = []
        self.normal_indices = []


def _get_floats(data, n):
    return [float(x) for x in data[1:(n + 1)]]


def _parse_face_token(token, vertex_indices, texture_indices, normal_indices):
    parts = token.split("/")
    parts_n = len(parts)
    vertex_indices.append(int(parts[0]) - 1)
    if parts_n >= 2 and parts[1]:
        texture_indices.append(int(parts[1]) - 1)
    if parts_n >= 3 and parts[2]:
        normal_indices.append(int(parts[2]) - 1)


def _parse_face(data):
    vertex_indices = []
    texture_indices = []
    normal_indices = []
    for i in [1, 2, 3]:
        _parse_face_token(data[i], vertex_indices, texture_indices, normal_indices)
    if len(data) >= 5:
        for i in [1, 3, 4]:
            _parse_face_token(data[i], vertex_indices, texture_indices, normal_indices)
    assert(len(normal_indices) % 3 == 0)
    return vertex_indices, texture_indices, normal_indices


def load(filename):
    mesh = Mesh()
    try:
        with open(filename) as file:
            for line in file:
                data = line.split()
                if not data:
                    continue
                if data[0] == "v":
                    mesh.vertices.append(_get_floats(data, 3))
                elif data[0] == "vn":
                    mesh.normals.append(_get_floats(data, 3))
                elif data[0] == "vt":
                    mesh.texture.append(_get_floats(data, 2))
                elif data[0] == "f":
                    vertex_indices, texture_indices, normal_indices = _parse_face(data)
                    mesh.vertex_indices.extend(vertex_indices)
                    mesh.texture_indices.extend(texture_indices)
                    mesh.normal_indices.extend(normal_indices)
    except Exception as e:
        print("Error loading model:", e)
        exit(1)
    return mesh
