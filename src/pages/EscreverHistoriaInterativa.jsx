import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Handle,
    Position,
    Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AuthContext } from '../contexts/AuthContext';
import { db } from '../services/firebaseConnection';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Editor } from '@tinymce/tinymce-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    MdAdd, MdSave, MdPublic, MdArrowBack, MdDelete, MdEdit,
    MdClose, MdFlag, MdCallSplit, MdPlayArrow, MdAutorenew
} from 'react-icons/md';
import { FiGitBranch } from 'react-icons/fi';

const OPEN_SOURCE_TINY = "https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js";
const TINY_CONFIG = {
    height: 280, menubar: false,
    plugins: 'anchor autolink charmap emoticons link lists searchreplace wordcount',
    toolbar: 'undo redo | bold italic underline | align | numlist bullist | emoticons | removeformat',
    skin: 'oxide-dark', content_css: 'dark',
    content_style: 'body { background: #0f0f0f; color: #e0e0e0; font-family: Georgia, serif; font-size: 15px; line-height: 1.7; padding: 12px; }'
};

// ─── CUSTOM SCENE NODE ───────────────────────────────────────────────────────
function SceneNode({ data, selected }) {
    const isEnding = data.isEnding;
    return (
        <div className={`
            relative rounded-xl border-2 transition-all duration-200 shadow-xl
            w-56 overflow-hidden cursor-pointer select-none
            ${selected
                ? isEnding ? 'border-amber-400 shadow-amber-400/30' : 'border-blue-400 shadow-blue-400/30'
                : isEnding ? 'border-amber-600/60 hover:border-amber-400/80' : 'border-slate-600/60 hover:border-blue-400/60'
            }
        `}
            style={{ background: isEnding ? 'linear-gradient(135deg,#1a120a,#2a1a0a)' : 'linear-gradient(135deg,#0d1117,#161b22)' }}
        >
            {/* Top accent bar */}
            <div className={`h-1 w-full ${isEnding ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`} />

            {/* Header */}
            <div className="px-3 pt-2 pb-1 flex items-center gap-2">
                {isEnding
                    ? <MdFlag size={14} className="text-amber-400 flex-shrink-0" />
                    : <MdCallSplit size={14} className="text-blue-400 flex-shrink-0" />
                }
                <span className={`text-xs font-bold uppercase tracking-wider truncate ${isEnding ? 'text-amber-300' : 'text-blue-300'}`}>
                    {isEnding ? 'Ending' : 'Scene'}
                </span>
                {data.isStart && (
                    <span className="ml-auto text-[9px] bg-green-500/30 text-green-400 px-1.5 py-0.5 rounded font-bold">START</span>
                )}
            </div>

            {/* Title */}
            <div className="px-3 pb-1">
                <p className="text-white font-semibold text-sm truncate">{data.title || 'Untitled Scene'}</p>
            </div>

            {/* Choices preview */}
            {!isEnding && data.choices?.length > 0 && (
                <div className="px-3 pb-2 space-y-1">
                    {data.choices.slice(0, 2).map((c, i) => (
                        <div key={i} className="text-[10px] bg-white/5 border border-white/10 rounded px-2 py-1 text-gray-400 truncate">
                            ➤ {c.label || 'Choice...'}
                        </div>
                    ))}
                    {data.choices.length > 2 && (
                        <div className="text-[10px] text-gray-600 pl-2">+{data.choices.length - 2} more...</div>
                    )}
                </div>
            )}
            {!isEnding && (!data.choices || data.choices.length === 0) && (
                <div className="px-3 pb-2">
                    <div className="text-[10px] text-gray-600 italic">No choices yet</div>
                </div>
            )}

            {/* Handles */}
            {!isEnding && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-300"
                    style={{ bottom: -6 }}
                />
            )}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-purple-500 !border-2 !border-purple-300"
                style={{ top: -6 }}
            />
        </div>
    );
}

const nodeTypes = { scene: SceneNode };

// ─── MAIN EDITOR ─────────────────────────────────────────────────────────────
export default function EscreverHistoriaInterativa() {
    const { id: editId } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Story meta
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [saving, setSaving] = useState(false);

    // Sidebar editing state – mirrors the selected node
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editChoices, setEditChoices] = useState([]);
    const [editIsEnding, setEditIsEnding] = useState(false);

    const nodeIdCounter = useRef(1);

    // ── Load existing story ──────────────────────────────────────
    useEffect(() => {
        if (!editId) return;
        async function load() {
            const snap = await getDoc(doc(db, 'historias_interativas', editId));
            if (!snap.exists()) return toast.error('Story not found.');
            const d = snap.data();
            setTitulo(d.titulo || '');
            setDescricao(d.descricao || '');

            // Reconstruct nodes + edges from stored data
            const storedNodes = (d.nodes || []).map(n => ({
                id: n.id,
                type: 'scene',
                position: n.position || { x: 0, y: 0 },
                data: {
                    title: n.title,
                    content: n.content,
                    choices: n.choices || [],
                    isEnding: n.isEnding || false,
                    isStart: n.id === d.startNodeId,
                }
            }));

            // Reconstruct edges from choices
            const storedEdges = [];
            (d.nodes || []).forEach(n => {
                (n.choices || []).forEach(ch => {
                    if (ch.targetNodeId) {
                        storedEdges.push({
                            id: `e-${n.id}-${ch.targetNodeId}-${ch.id}`,
                            source: n.id,
                            target: ch.targetNodeId,
                            label: ch.label,
                            style: { stroke: '#4a90e2', strokeWidth: 2 },
                            labelStyle: { fill: '#aaa', fontSize: 11 },
                            labelBgStyle: { fill: '#1a1a1a', fillOpacity: 0.9 },
                        });
                    }
                });
            });

            setNodes(storedNodes);
            setEdges(storedEdges);

            // Set counter above existing max
            const maxNum = storedNodes.reduce((acc, n) => {
                const num = parseInt(n.id.replace('node-', ''), 10);
                return isNaN(num) ? acc : Math.max(acc, num);
            }, 0);
            nodeIdCounter.current = maxNum + 1;
        }
        load();
    }, [editId]);

    // ── Sync sidebar when selected node changes ──────────────────
    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    useEffect(() => {
        if (selectedNode) {
            setEditTitle(selectedNode.data.title || '');
            setEditContent(selectedNode.data.content || '');
            setEditChoices(selectedNode.data.choices ? JSON.parse(JSON.stringify(selectedNode.data.choices)) : []);
            setEditIsEnding(selectedNode.data.isEnding || false);
            setSidebarOpen(true);
        } else {
            setSidebarOpen(false);
        }
    }, [selectedNodeId]);

    const onConnect = useCallback((params) => {
        setEdges(eds => addEdge({
            ...params,
            style: { stroke: '#4a90e2', strokeWidth: 2 },
        }, eds));
    }, [setEdges]);

    const onNodeClick = useCallback((_evt, node) => {
        setSelectedNodeId(node.id);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    // ── Add new node ─────────────────────────────────────────────
    const addNode = useCallback((isEnding = false) => {
        const id = `node-${nodeIdCounter.current++}`;
        const isFirst = nodes.length === 0;
        const newNode = {
            id,
            type: 'scene',
            position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
            data: {
                title: isFirst ? 'Start' : isEnding ? 'The End' : 'New Scene',
                content: '',
                choices: [],
                isEnding,
                isStart: isFirst,
            }
        };
        setNodes(nds => [...nds, newNode]);
        setSelectedNodeId(id);
    }, [nodes.length, setNodes]);

    const deleteSelectedNode = useCallback(() => {
        if (!selectedNodeId) return;
        setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
        setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
        setSelectedNodeId(null);
    }, [selectedNodeId, setNodes, setEdges]);

    // ── Save sidebar edits back to node ─────────────────────────
    const applyEdits = useCallback(() => {
        if (!selectedNodeId) return;
        setNodes(nds => nds.map(n => {
            if (n.id !== selectedNodeId) return n;
            return {
                ...n,
                data: {
                    ...n.data,
                    title: editTitle,
                    content: editContent,
                    choices: editChoices,
                    isEnding: editIsEnding,
                }
            };
        }));

        // Rebuild edges for this node's choices
        setEdges(eds => {
            const filtered = eds.filter(e => e.source !== selectedNodeId);
            const newEdges = editChoices
                .filter(c => c.targetNodeId)
                .map(c => ({
                    id: `e-${selectedNodeId}-${c.targetNodeId}-${c.id}`,
                    source: selectedNodeId,
                    target: c.targetNodeId,
                    label: c.label,
                    style: { stroke: '#4a90e2', strokeWidth: 2 },
                    labelStyle: { fill: '#aaa', fontSize: 11 },
                    labelBgStyle: { fill: '#1a1a1a', fillOpacity: 0.9 },
                }));
            return [...filtered, ...newEdges];
        });

        toast.success('Scene updated!', { icon: '✅' });
    }, [selectedNodeId, editTitle, editContent, editChoices, editIsEnding, setNodes, setEdges]);

    // ── Choice helpers ───────────────────────────────────────────
    const addChoice = () => {
        setEditChoices(prev => [
            ...prev,
            { id: `choice-${Date.now()}`, label: '', targetNodeId: '' }
        ]);
    };

    const updateChoice = (idx, field, value) => {
        setEditChoices(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
    };

    const removeChoice = (idx) => {
        setEditChoices(prev => prev.filter((_, i) => i !== idx));
    };

    // ── Serialize and save ───────────────────────────────────────
    const serialize = () => {
        const startNode = nodes.find(n => n.data.isStart) || nodes[0];
        const serializedNodes = nodes.map(n => ({
            id: n.id,
            title: n.data.title,
            content: n.data.content,
            choices: n.data.choices,
            isEnding: n.data.isEnding,
            position: n.position,
        }));
        return { nodes: serializedNodes, startNodeId: startNode?.id || null };
    };

    const handleSave = async (status = 'draft') => {
        if (!user) return toast.error('You must be logged in!');
        if (!titulo.trim()) return toast.error('Please enter a title.');
        if (nodes.length === 0) return toast.error('Add at least one scene.');

        setSaving(true);
        const toastId = toast.loading(status === 'draft' ? 'Saving draft...' : 'Publishing...');

        try {
            const { nodes: serializedNodes, startNodeId } = serialize();
            const payload = {
                titulo: titulo.trim(),
                descricao: descricao.trim(),
                autorId: user.uid,
                autor: user.name,
                status,
                nodes: serializedNodes,
                startNodeId,
                lastUpdated: serverTimestamp(),
            };

            if (editId) {
                await updateDoc(doc(db, 'historias_interativas', editId), payload);
                toast.success(status === 'draft' ? 'Draft saved!' : 'Published!', { id: toastId });
            } else {
                payload.dataCriacao = serverTimestamp();
                const ref = await addDoc(collection(db, 'historias_interativas'), payload);
                toast.success(status === 'draft' ? 'Draft saved!' : 'Published!', { id: toastId });
                navigate(`/escrever-historia-interativa/${ref.id}`, { replace: true });
            }
        } catch (err) {
            console.error(err);
            toast.error('Error: ' + err.message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handlePreview = () => {
        if (editId) {
            window.open(`/historia-interativa/${editId}`, '_blank');
        } else {
            toast('Save first to preview!');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-[#080b10]">

            {/* ─── TOP TOOLBAR ──────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0d1117] border-b border-white/10 flex-shrink-0 z-10">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    title="Back to Dashboard"
                >
                    <MdArrowBack size={20} />
                </button>

                <FiGitBranch className="text-blue-400 text-xl flex-shrink-0" />

                <div className="flex flex-col">
                    <input
                        type="text"
                        value={titulo}
                        onChange={e => setTitulo(e.target.value)}
                        placeholder="Story title..."
                        className="bg-transparent text-white font-bold text-base outline-none placeholder-gray-600 w-48"
                    />
                    <input
                        type="text"
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                        placeholder="Short description..."
                        className="bg-transparent text-gray-400 text-xs outline-none placeholder-gray-700 w-64"
                    />
                </div>

                <div className="flex-1" />

                {/* Action buttons */}
                <button
                    onClick={() => addNode(false)}
                    className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                >
                    <MdAdd size={18} /> Add Scene
                </button>
                <button
                    onClick={() => addNode(true)}
                    className="flex items-center gap-2 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                >
                    <MdFlag size={16} /> Add Ending
                </button>

                <div className="w-px bg-white/10 h-8 mx-1" />

                <button
                    onClick={handlePreview}
                    disabled={!editId}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-40"
                >
                    <MdPlayArrow size={18} /> Preview
                </button>
                <button
                    onClick={() => handleSave('draft')}
                    disabled={saving}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-gray-200 px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                >
                    <MdSave size={18} /> Save Draft
                </button>
                <button
                    onClick={() => handleSave('public')}
                    disabled={saving}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                >
                    <MdPublic size={18} /> Publish
                </button>
            </div>

            {/* ─── MAIN AREA: FLOW + SIDEBAR ───────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ReactFlow Canvas */}
                <div className="flex-1 relative">
                    {nodes.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                            <FiGitBranch size={56} className="text-white/10 mb-4" />
                            <h3 className="text-white/30 text-xl font-bold mb-2">Your story graph is empty</h3>
                            <p className="text-white/20 text-sm">Click <b>Add Scene</b> in the toolbar to get started</p>
                        </div>
                    )}
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        fitView
                        colorMode="dark"
                        defaultEdgeOptions={{
                            style: { stroke: '#4a90e2', strokeWidth: 2 },
                            animated: true,
                        }}
                    >
                        <Background color="#1a2035" gap={24} size={1} />
                        <Controls className="!bg-[#0d1117] !border-white/10" />
                        <MiniMap
                            className="!bg-[#0d1117] !border-white/10"
                            nodeColor={n => n.data.isEnding ? '#b45309' : '#1d4ed8'}
                        />
                        <Panel position="bottom-left">
                            <div className="flex gap-3 text-[10px] text-gray-600">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Scene</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Ending</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Start</span>
                            </div>
                        </Panel>
                    </ReactFlow>
                </div>

                {/* ─── SIDEBAR ─────────────────────────────────────── */}
                <div className={`
                    flex-shrink-0 border-l border-white/10 bg-[#0d1117] overflow-y-auto
                    transition-all duration-300
                    ${sidebarOpen ? 'w-96' : 'w-0 overflow-hidden border-0'}
                `}>
                    {sidebarOpen && selectedNode && (
                        <div className="p-5 space-y-5">

                            {/* Sidebar header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {editIsEnding
                                        ? <MdFlag className="text-amber-400" size={18} />
                                        : <MdEdit className="text-blue-400" size={18} />
                                    }
                                    <span className="text-white font-bold text-sm">Edit Scene</span>
                                    {selectedNode.data.isStart && (
                                        <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-bold">START</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={deleteSelectedNode}
                                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                                        title="Delete node"
                                    >
                                        <MdDelete size={16} />
                                    </button>
                                    <button
                                        onClick={() => setSelectedNodeId(null)}
                                        className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-all"
                                    >
                                        <MdClose size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Node type toggle */}
                            <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                                <button
                                    onClick={() => setEditIsEnding(false)}
                                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${!editIsEnding ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Scene
                                </button>
                                <button
                                    onClick={() => setEditIsEnding(true)}
                                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${editIsEnding ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Ending
                                </button>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 tracking-wider">Scene Title</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none"
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 tracking-wider">Content</label>
                                <div className="rounded-lg overflow-hidden border border-white/10">
                                    <Editor
                                        key={selectedNodeId}
                                        tinymceScriptSrc={OPEN_SOURCE_TINY}
                                        initialValue={editContent}
                                        init={TINY_CONFIG}
                                        onEditorChange={val => setEditContent(val)}
                                    />
                                </div>
                            </div>

                            {/* Choices — only for non-ending nodes */}
                            {!editIsEnding && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reader Choices</label>
                                        <button
                                            onClick={addChoice}
                                            className="text-[10px] bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 px-2 py-1 rounded font-bold transition-all flex items-center gap-1"
                                        >
                                            <MdAdd size={12} /> Add Choice
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {editChoices.length === 0 && (
                                            <p className="text-center text-gray-600 text-xs italic py-3 bg-white/3 rounded-lg border border-dashed border-white/10">
                                                No choices yet. Add one to create a branch.
                                            </p>
                                        )}
                                        {editChoices.map((choice, idx) => (
                                            <div key={choice.id} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-blue-400 uppercase">Choice {idx + 1}</span>
                                                    <button onClick={() => removeChoice(idx)} className="text-red-400 hover:text-red-300 transition-colors">
                                                        <MdClose size={14} />
                                                    </button>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder='Button label (e.g. "Go left")'
                                                    value={choice.label}
                                                    onChange={e => updateChoice(idx, 'label', e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:border-blue-500 outline-none"
                                                />
                                                <select
                                                    value={choice.targetNodeId}
                                                    onChange={e => updateChoice(idx, 'targetNodeId', e.target.value)}
                                                    className="w-full bg-[#0d1117] border border-white/10 rounded px-2 py-1.5 text-gray-300 text-xs focus:border-blue-500 outline-none cursor-pointer"
                                                >
                                                    <option value="">→ Select target scene</option>
                                                    {nodes
                                                        .filter(n => n.id !== selectedNodeId)
                                                        .map(n => (
                                                            <option key={n.id} value={n.id}>
                                                                {n.data.title || n.id}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Apply button */}
                            <button
                                onClick={applyEdits}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                            >
                                <MdAutorenew size={18} /> Apply Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
