using System.Linq;
using System.Collections.Generic;

namespace PrintProjects.ThreeMF.Model
{
    public sealed class Mesh
    {
        private readonly CMeshObject _mesh;

        public Mesh(CMeshObject mesh)
        {
            _mesh = mesh;

            uint resId, propId;
            _mesh.GetObjectLevelProperty(out resId, out propId);

            Id = _mesh.GetResourceID();
            Name = _mesh.GetName();
            RessourceId = resId;
            PropertyId = propId;

            LoadVertices();
            LoadTriangles();
        }

        private void LoadVertices()
        {
            var positions = new sPosition[_mesh.GetVertexCount()];
            _mesh.GetVertices(out positions);

            NativeVertices = positions;
            Vertices = positions
                .Select(p => new Vertex(p))
                .ToList();
        }

        private void LoadTriangles()
        {
            var triangles = new sTriangle[_mesh.GetTriangleCount()];
            _mesh.GetTriangleIndices(out triangles);

            NativeTriangles = triangles;
            Triangles = triangles
                .Select(t=> new Triangle(t))
                .ToList();
        }

        public uint Id { get; private set; }
        public string Name { get; set; }
        public uint RessourceId { get; private set; }
        public uint PropertyId { get; private set; }
        
        public sPosition[] NativeVertices { get; private set; }
        public sTriangle[] NativeTriangles { get; private set; }

        public List<Vertex> Vertices { get; private set; } 
        public List<Triangle> Triangles { get; private set; } 
    }
}
