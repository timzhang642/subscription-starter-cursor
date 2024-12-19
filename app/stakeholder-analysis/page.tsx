'use client';

import { useState, useEffect, useRef } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Button from '@/components/ui/Button';
import * as d3 from 'd3';

// Constants
const MAX_NODES_TO_DISPLAY = 20;

interface Node {
  id: string;
  name: string;
  role: string;
  goals: string[];
  x?: number;
  y?: number;
}

interface Link {
  source: string;
  target: string;
  label: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface Stakeholder {
  name: string;
  role: string;
  goals: string[];
}

interface Relationship {
  from: string;
  to: string;
  label: string;
}

interface StakeholderResponse {
  stakeholders: {
    [key: string]: Stakeholder;
  };
  relationships: Relationship[];
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  keyOutputs: string[];
  decisions: string[];
}

interface WorkflowResponse {
  workflow: WorkflowStep[];
}

interface StakeholderWorkflow {
  stakeholder: string;
  isExpanded: boolean;
  steps: WorkflowStep[];
}

interface PainPoint {
  point: string;
  sources: {
    platform: string;
    title: string;
    url: string;
    date: string;
    evidence: string;
  }[];
}

interface StepAnalysis {
  painPoints: PainPoint[];
}

// Mock data for testing
const mockData: GraphData = {
  nodes: [],
  links: []
};

export default function StakeholderAnalysis() {
  const [industry, setIndustry] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [workflowSections, setWorkflowSections] = useState<StakeholderWorkflow[]>([]);
  const [selectedStep, setSelectedStep] = useState<{ id: string; stakeholder: string; title: string; description: string; estimatedTime: string; keyOutputs: string[]; decisions: string[] } | null>(null);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [analyzingStakeholder, setAnalyzingStakeholder] = useState<string | null>(null);
  const [isAnalyzingStep, setIsAnalyzingStep] = useState(false);
  const [stepBeingAnalyzed, setStepBeingAnalyzed] = useState<string | null>(null);
  const [stepAnalysis, setStepAnalysis] = useState<StepAnalysis | null>(null);
  const [expandedPainPoints, setExpandedPainPoints] = useState<string[]>([]);
  const [analysisCache, setAnalysisCache] = useState<Record<string, StepAnalysis>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Update dimensions when container size changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };

    // Initial update
    updateDimensions();
    
    // Create ResizeObserver for more reliable size detection
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Fallback to window resize event
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // For testing, set mock data
  useEffect(() => {
    setGraphData(mockData);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        redirect('/signin');
      }
    };
    checkAuth();
  }, []);

  // Initialize workflowSections with all stakeholders when graphData changes
  useEffect(() => {
    if (graphData?.nodes) {
      const existingSections = new Set(workflowSections.map(s => s.stakeholder));
      const newSections = graphData.nodes
        .filter(node => !existingSections.has(node.name))
        .map(node => ({
          stakeholder: node.name,
          isExpanded: false,
          steps: []
        }));

      if (newSections.length > 0) {
        setWorkflowSections(prev => [...prev, ...newSections]);
      }
    }
  }, [graphData]);

  const fetchStakeholderWorkflow = async (stakeholderName: string) => {
    setAnalyzingStakeholder(stakeholderName);
    setIsLoadingWorkflow(true);
    setError(null);

    try {
      const otherStakeholders = graphData?.nodes
        .filter(n => n.name !== stakeholderName)
        .map(n => n.name) || [];

      const response = await fetch('https://hook.us1.make.com/v95s2jcog6gxzdh47es3o23lepxae5xl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          industry: industry.trim(),
          stakeholder: stakeholderName,
          otherStakeholders: otherStakeholders
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch workflow');
      }
      
      const data = await response.json();
      
      if (!data || !Array.isArray(data.workflow)) {
        throw new Error('Invalid workflow data format');
      }

      // Ensure each step has a unique ID by combining stakeholder and step index
      const stepsWithIds = data.workflow.map((step: any, index: number) => ({
        ...step,
        id: `${stakeholderName}-step-${index}`,
      }));

      // Update the workflow section for this stakeholder
      setWorkflowSections(sections =>
        sections.map(section =>
          section.stakeholder === stakeholderName
            ? { ...section, steps: stepsWithIds, isExpanded: true }
            : section
        )
      );

      return data.workflow;
    } catch (error) {
      console.error('Workflow fetch error:', error);
      setError('Failed to fetch stakeholder workflow. Please try again.');
      return null;
    } finally {
      setIsLoadingWorkflow(false);
      setAnalyzingStakeholder(null);
    }
  };

  const handleStakeholderSelect = async (stakeholderName: string) => {
    // Find the corresponding node
    const node = graphData?.nodes.find(n => n.name === stakeholderName);
    if (node) {
      setSelectedNode(node);
    }

    // Find existing workflow
    const existingWorkflow = workflowSections.find(
      section => section.stakeholder === stakeholderName
    );

    // If no workflow steps exist, fetch them
    if (!existingWorkflow?.steps.length) {
      const workflow = await fetchStakeholderWorkflow(stakeholderName);
      if (workflow?.length > 0) {
        setSelectedStep({
          ...workflow[0],
          stakeholder: stakeholderName
        });
      }
    } else {
      // If workflow exists, just expand the section and select first step
      setWorkflowSections(sections =>
        sections.map(section =>
          section.stakeholder === stakeholderName
            ? { ...section, isExpanded: true }
            : section
        )
      );
      if (existingWorkflow.steps.length > 0) {
        setSelectedStep({
          ...existingWorkflow.steps[0],
          stakeholder: stakeholderName
        });
      }
    }
  };

  const handleNodeClick = async (node: Node) => {
    // Prevent clicking other nodes while analyzing
    if (analyzingStakeholder) return;
    await handleStakeholderSelect(node.name);
  };

  const handleAnalyze = async () => {
    if (!industry.trim()) {
      setError('Please enter an industry or use-case');
      return;
    }
    
    setError(null);
    setIsAnalyzing(true);
    try {
      const response = await fetch('https://hook.us1.make.com/gs3s48y3peep1kvd4onaaupo56128f1g', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ industry }),
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      const data: StakeholderResponse = await response.json();
      
      // Validate data structure
      if (!data.stakeholders || typeof data.stakeholders !== 'object') {
        throw new Error('Invalid stakeholder data format');
      }

      // Transform and validate data
      const nodes = Object.entries(data.stakeholders).map(([id, stakeholder]) => {
        if (!stakeholder.name || !stakeholder.role || !Array.isArray(stakeholder.goals)) {
          throw new Error('Invalid stakeholder data format');
        }
        return {
          id,
          name: stakeholder.name,
          role: stakeholder.role,
          goals: stakeholder.goals,
        };
      });

      const links = data.relationships.map(rel => {
        if (!rel.from || !rel.to || !rel.label) {
          throw new Error('Invalid relationship data format');
        }
        if (!nodes.some(n => n.id === rel.from) || !nodes.some(n => n.id === rel.to)) {
          throw new Error('Relationship references non-existent node');
        }
        return {
          source: rel.from,
          target: rel.to,
          label: rel.label,
        };
      });

      // Handle large networks
      if (nodes.length > MAX_NODES_TO_DISPLAY) {
        setError(`Network is too large (${nodes.length} nodes). Showing top ${MAX_NODES_TO_DISPLAY} most connected nodes.`);
        // Sort nodes by degree (importance) and take top N
        const nodesByDegree = nodes.sort((a, b) => {
          const degreeA = links.filter(l => l.source === a.id || l.target === a.id).length;
          const degreeB = links.filter(l => l.source === b.id || l.target === b.id).length;
          return degreeB - degreeA;
        }).slice(0, MAX_NODES_TO_DISPLAY);
        
        // Filter links to only include selected nodes
        const filteredLinks = links.filter(l => 
          nodesByDegree.some(n => n.id === l.source) && 
          nodesByDegree.some(n => n.id === l.target)
        );
        
        setGraphData({ nodes: nodesByDegree, links: filteredLinks });
        setSelectedNode(null); // Reset selected node
      } else {
        setGraphData({ nodes, links });
        setSelectedNode(null); // Reset selected node
      }
      
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to analyze. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSection = (stakeholder: string) => {
    // Clear selected step when collapsing a section
    setWorkflowSections(sections =>
      sections.map(section => {
        if (section.stakeholder === stakeholder) {
          const newIsExpanded = !section.isExpanded;
          // If we're collapsing this section and it contains the selected step, clear the selection
          if (!newIsExpanded && section.steps.some(step => step.id === selectedStep?.id)) {
            setSelectedStep(null);
          }
          return { ...section, isExpanded: newIsExpanded };
        }
        return section;
      })
    );
  };

  const calculateLayout = (nodes: Node[], links: Link[]) => {
    const padding = 150; // Increased padding from edges
    const nodeRadius = 45; // Slightly larger nodes
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    
    // For two nodes, position them horizontally with more space
    if (nodes.length === 2) {
      const spacing = 250; // Increased spacing between nodes
      return nodes.map((node, index) => ({
        ...node,
        x: centerX + (index === 0 ? -spacing : spacing) / 2,
        y: centerY
      }));
    }
    
    // Create a map of node degrees
    const degrees = new Map();
    links.forEach(link => {
      degrees.set(link.source, (degrees.get(link.source) || 0) + 1);
      degrees.set(link.target, (degrees.get(link.target) || 0) + 1);
    });

    // Dynamic radius based on number of nodes
    const baseRadius = Math.min(dimensions.width, dimensions.height) / 3;
    const minSpacing = 250; // Increased spacing between nodes
    const circumference = nodes.length * minSpacing;
    const dynamicRadius = Math.max(baseRadius, circumference / (2 * Math.PI));

    // Calculate positions based on node importance
    return nodes.map((node, i) => {
      const degree = degrees.get(node.id) || 0;
      const angle = (i * 2 * Math.PI) / nodes.length;
      // Adjust radius based on both degree and total nodes
      const radius = dynamicRadius - (degree * 20);
      
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
  };

  const calculateLabelPosition = (startX: number, startY: number, endX: number, endY: number, index: number, total: number) => {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    // Calculate normal vector to the line
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const normalX = -dy / length;
    const normalY = dx / length;
    
    // Dynamic offset based on number of parallel edges
    const baseOffset = Math.min(60, 40 + (total * 5)); // Scale offset with number of edges
    let offset = 0;
    
    if (total > 1) {
      // For parallel edges, distribute labels more widely
      offset = (index - (total - 1) / 2) * baseOffset;
      
      // Add slight curve to the offset based on index
      const curveMultiplier = 0.3;
      offset += Math.sign(offset) * Math.abs(offset) * curveMultiplier;
    }
    
    return {
      x: midX + normalX * offset,
      y: midY + normalY * offset
    };
  };

  const getNodePosition = (node: Node) => ({
    left: `${node.x}px`,
    top: `${node.y}px`,
    transform: 'translate(-50%, -50%)'
  });

  const getAnalysisCacheKey = (industry: string, stakeholder: string, step: string) => {
    return `${industry.toLowerCase()}_${stakeholder.toLowerCase()}_${step.toLowerCase()}`.replace(/\s+/g, '_');
  };

  const analyzeStepDetails = async (step: WorkflowStep & { stakeholder: string }) => {
    const selectedIndustry = industry.trim();
    const cacheKey = getAnalysisCacheKey(selectedIndustry, step.stakeholder, step.title);

    // Check if we have cached results
    if (analysisCache[cacheKey]) {
      setStepAnalysis(analysisCache[cacheKey]);
      return;
    }

    try {
      setIsAnalyzingStep(true);
      setStepAnalysis(null);
      
      const response = await fetch('/api/analyze-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry: selectedIndustry,
          stakeholder: step.stakeholder,
          step: step.title,
          description: step.description
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze step details');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze step details');
      }

      // Cache the results
      setAnalysisCache(prev => ({
        ...prev,
        [cacheKey]: data.data
      }));

      setStepAnalysis(data.data);
      console.log('Step analysis:', data.data);
    } catch (error) {
      console.error('Error analyzing step:', error);
      setError('Failed to analyze step details');
    } finally {
      setIsAnalyzingStep(false);
    }
  };

  const handleStepClick = (step: WorkflowStep & { stakeholder: string }) => {
    setSelectedStep(step);
    
    // Check cache and set analysis immediately if available
    const cacheKey = getAnalysisCacheKey(industry.trim(), step.stakeholder, step.title);
    const cachedAnalysis = analysisCache[cacheKey];
    setStepAnalysis(cachedAnalysis || null);
  };

  const handleAnalyzeStep = async () => {
    if (!selectedStep) return;
    setStepBeingAnalyzed(selectedStep.id);
    await analyzeStepDetails(selectedStep);
    setStepBeingAnalyzed(null);
  };

  const togglePainPoint = (point: string) => {
    setExpandedPainPoints(prev => 
      prev.includes(point) 
        ? prev.filter(p => p !== point)
        : [...prev, point]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlatformIcon = (platform: string) => {
    const iconClasses = "w-3 h-3";
    
    switch (platform?.toLowerCase()) {
      case 'twitter':
      case 'x':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      case 'linkedin':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        );
      case 'news':
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2zM5 6v12h14V6H5zm2 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
          </svg>
        );
      default:
        return (
          <svg className={iconClasses} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        );
    }
  };

  useEffect(() => {
    if (!graphData || !svgRef.current || !dimensions.width) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    // Enable pointer events on SVG
    svg.style("pointer-events", "all");

    const NODE_RADIUS = 60;
    const LABEL_WIDTH = 120;
    const LABEL_HEIGHT = 24;

    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links).id((d: any) => d.id).distance(300))
      .force("charge", d3.forceManyBody().strength(-2000))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2));

    // Add arrow marker
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .join("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", NODE_RADIUS + 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#4B5563")
      .attr("d", "M0,-5L10,0L0,5");

    const linkGroup = svg.append("g");
    const labelGroup = svg.append("g");
    const nodeGroup = svg.append("g");

    // Add links
    const links = linkGroup.selectAll("path")
      .data(graphData.links)
      .join("path")
      .attr("stroke", "#4B5563")
      .attr("stroke-width", 1.55)
      .attr("marker-end", "url(#arrowhead)")
      .attr("fill", "none");

    // Add edge labels
    const labelContainers = labelGroup.selectAll("g")
      .data(graphData.links)
      .join("g");

    /*
    labelContainers.append("rect")
      .attr("fill", "#1F2937")
      .attr("rx", 12)
      .attr("width", LABEL_WIDTH)
      .attr("height", LABEL_HEIGHT)
      .attr("opacity", 0.95);
    */

    labelContainers.append("text")
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "11")
      .text(d => d.label);

    // Add nodes with drag behavior
    const nodes = nodeGroup.selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d) => handleNodeClick(d))
      .call(d3.drag()
        .on("start", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    nodes.append("circle")
      .attr("r", NODE_RADIUS)
      .attr("fill", d => selectedNode?.id === d.id ? "#4338CA" : "#4F46E5")
      .attr("class", "transition-colors duration-200 hover:fill-indigo-500");

    nodes.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .attr("fill", "white")
      .attr("font-size", "14")
      .attr("pointer-events", "none")
      .text(d => d.name);

    simulation.on("tick", () => {
      // Update links with curved paths
      links.attr("d", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate control point for quadratic curve
        const offset = dr * 0.2; // Make curve proportional to distance
        const midX = (d.source.x + d.target.x) / 2;
        const midY = (d.source.y + d.target.y) / 2;
        
        // Perpendicular offset for control point
        const nx = -dy / dr;
        const ny = dx / dr;
        
        const controlX = midX + offset * nx;
        const controlY = midY + offset * ny;
        
        return `M${d.source.x},${d.source.y} Q${controlX},${controlY} ${d.target.x},${d.target.y}`;
      });

      // Update edge label positions
      labelContainers.attr("transform", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate position along the curve
        const t = 0.5; // Position at midpoint
        const midX = (d.source.x + d.target.x) / 2;
        const midY = (d.source.y + d.target.y) / 2;
        
        // Calculate offset based on curve
        const offset = dr * 0.15; // Match curve offset
        const nx = -dy / dr;
        const ny = dx / dr;
        
        // Position label above the curve
        //const labelX = midX + offset * nx - LABEL_WIDTH/2;
        //const labelY = midY + offset * ny - LABEL_HEIGHT - 10; // Add extra vertical offset
        const labelX = midX + offset * nx;
        const labelY = midY + offset * ny;

        return `translate(${labelX},${labelY})`;
      });

      // Update node positions
      nodes.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [graphData, dimensions.width, dimensions.height]);

  return (
    <section className="mb-32 bg-black min-h-screen">
      <div className="max-w-7xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
        <div className="sm:align-center sm:flex sm:flex-col">
          <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
            Stakeholder Analysis
          </h1>
        </div>
        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-1 sm:gap-6 lg:max-w-4xl lg:mx-auto">
          <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <label htmlFor="industry" className="text-white">Industry/Use-case</label>
                <input
                  id="industry"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Enter industry or use-case"
                  className="w-full p-3 rounded-md bg-zinc-800 text-white"
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
              <Button
                variant="slim"
                type="button"
                onClick={handleAnalyze}
                loading={isAnalyzing}
                className="mt-4"
              >
                Analyze
              </Button>
            </div>
          </div>
        </div>

        {graphData && (
          <div className="mt-12 flex gap-8">
            {/* Graph Section */}
            <div className="flex-1">
              <div className="flex flex-col w-full gap-4">
                <div className="flex flex-col items-center text-center gap-2 mb-4">
                  <h2 className="text-2xl font-bold text-white">Key Stakeholder Relationships</h2>
                  <p className="text-gray-400 text-sm">
                    Click on any circle to see more details about that stakeholder.
                  </p>
                </div>
                
                <div ref={containerRef} className="relative w-full aspect-[16/9] bg-gray-900 rounded-lg">
                  <svg ref={svgRef} className="w-full h-full absolute inset-0 pointer-events-none">
                  </svg>
                </div>
                
                <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                    <span>Stakeholder</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-[1px] bg-gray-600"></div>
                    <span>Relationship</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="w-80 shrink-0">
              <div className="sticky top-4 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                {selectedNode ? (
                  <>
                    <h3 className="text-xl font-bold text-white mb-2">{selectedNode.name}</h3>
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-zinc-400 mb-1">Role</h4>
                      <p className="text-white">{selectedNode.role}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-400 mb-1">Goals</h4>
                      <ul className="list-disc list-inside text-white">
                        {selectedNode.goals.map((goal: string, index: number) => (
                          <li key={index} className="text-sm">{goal}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="text-zinc-400 text-center">Select a node to view details</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workflow Section */}
        {selectedNode && (
          <div className="mt-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
              <div className="flex">
                {/* Left Panel - Workflow Steps */}
                <div className="w-1/3 border-r border-zinc-800 p-6">
                  <h3 className="text-xl font-bold text-white mb-6">Workflow Analysis</h3>
                  <div className="space-y-4">
                    {workflowSections.map((section) => (
                      <div key={section.stakeholder} className="bg-zinc-900 rounded-lg overflow-hidden">
                        <button
                          onClick={() => {
                            if (analyzingStakeholder) return; // Prevent clicking while analyzing
                            if (section.steps.length === 0) {
                              handleStakeholderSelect(section.stakeholder);
                            } else {
                              toggleSection(section.stakeholder);
                            }
                          }}
                          disabled={analyzingStakeholder !== null}
                          className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                            analyzingStakeholder && analyzingStakeholder !== section.stakeholder
                              ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                              : 'bg-zinc-800 hover:bg-zinc-700'
                          }`}
                        >
                          <span className="text-white font-medium">{section.stakeholder}</span>
                          <div className="flex items-center">
                            {analyzingStakeholder === section.stakeholder ? (
                              <div className="w-5 h-5 mr-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                              </div>
                            ) : null}
                            <svg
                              className={`w-5 h-5 text-zinc-400 transform transition-transform ${
                                section.isExpanded ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {section.isExpanded && section.steps.length > 0 && (
                          <div className="p-2">
                            {section.steps.map((step, index) => (
                              <button
                                key={step.id}
                                onClick={() => handleStepClick({
                                  ...step,
                                  stakeholder: section.stakeholder
                                })}
                                className={`w-full text-left p-3 rounded-lg transition-colors duration-200 flex items-center space-x-3 ${
                                  selectedStep?.id === step.id && selectedStep?.stakeholder === section.stakeholder
                                    ? 'bg-indigo-600 text-white'
                                    : 'hover:bg-zinc-700 text-zinc-200'
                                }`}
                              >
                                <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full ${
                                  selectedStep?.id === step.id && selectedStep?.stakeholder === section.stakeholder ? 'bg-indigo-500' : 'bg-zinc-700'
                                }`}>
                                  <span className="text-sm text-white">{index + 1}</span>
                                </div>
                                <span className={`flex-1 ${
                                  selectedStep?.id === step.id && selectedStep?.stakeholder === section.stakeholder ? 'text-white' : 'text-zinc-200'
                                }`}>
                                  {step.title}
                                </span>
                                {isAnalyzingStep && selectedStep?.id === step.id && (
                                  <div className="w-4 h-4">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Panel - Step Details */}
                <div className="flex-1 p-6">
                  {selectedStep ? (
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">{selectedStep.title}</h3>
                      <p className="text-zinc-400 text-lg mb-8">{selectedStep.description}</p>

                      <div className="grid grid-cols-2 gap-6">
                        {/* Severity & Frequency */}
                        <div className="col-span-2 flex justify-between items-center p-4 bg-zinc-800 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
                            <span className="text-zinc-400">Estimated Time:</span>
                            <span className="ml-2 text-white font-medium">{selectedStep.estimatedTime}</span>
                          </div>
                        </div>

                        {/* Key Outputs */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-zinc-400">Key Outputs</h4>
                          <ul className="list-disc list-inside space-y-2">
                            {selectedStep.keyOutputs.map((output, index) => (
                              <li key={index} className="text-white text-sm">{output}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Decisions */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-zinc-400">Key Decisions</h4>
                          <ul className="list-disc list-inside space-y-2">
                            {selectedStep.decisions.map((decision, index) => (
                              <li key={index} className="text-white text-sm">{decision}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {selectedStep && !stepAnalysis && !isAnalyzingStep && (
                        <div className="flex justify-center mt-6">
                          <button
                            onClick={handleAnalyzeStep}
                            className="px-4 py-2 rounded-md text-sm font-medium transition-colors
                              bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            Search Pain Points at This Step
                          </button>
                        </div>
                      )}

                      {isAnalyzingStep && stepBeingAnalyzed === selectedStep?.id && (
                        <div className="mt-4 p-4 bg-zinc-800 rounded-lg">
                          <div className="flex items-center justify-center space-x-3 text-zinc-400">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                            <span>Analyzing pain points for this step...</span>
                          </div>
                        </div>
                      )}

                      {stepAnalysis?.painPoints && (
                        <div className="bg-zinc-800 rounded-lg p-4 text-zinc-200 mt-6">
                          <h3 className="text-lg font-medium mb-4">Pain Points</h3>
                          <div className="space-y-4">
                            {[...stepAnalysis.painPoints]
                              .sort((a, b) => b.sources.length - a.sources.length)
                              .map((painPoint: any, index: number) => (
                              <div key={index} className="border border-zinc-700 rounded-lg overflow-hidden">
                                <button
                                  onClick={() => togglePainPoint(painPoint.point)}
                                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-700 transition-colors"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium">{painPoint.point}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-xs text-zinc-400">Mentions ({painPoint.sources.length})</span>
                                      <div className="flex space-x-1">
                                        {painPoint.sources.slice(0, 5).map((source: any, idx: number) => (
                                          <div key={idx} className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center">
                                            {getPlatformIcon(source.platform)}
                                          </div>
                                        ))}
                                        {painPoint.sources.length > 5 && (
                                          <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-300">
                                            +{painPoint.sources.length - 5}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <svg
                                      className={`w-5 h-5 transform transition-transform ${
                                        expandedPainPoints.includes(painPoint.point) ? 'rotate-180' : ''
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </button>
                                
                                {expandedPainPoints.includes(painPoint.point) && (
                                  <div className="border-t border-zinc-700">
                                    {painPoint.sources.map((source: any, sourceIndex: number) => (
                                      <div key={sourceIndex} className="p-4 border-b border-zinc-700 last:border-b-0">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center">
                                              {getPlatformIcon(source.platform)}
                                            </div>
                                            <a
                                              href={source.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
                                            >
                                              {source.title}
                                            </a>
                                          </div>
                                          <span className="text-xs text-zinc-400">
                                            {formatDate(source.date)}
                                          </span>
                                        </div>
                                        <p className="text-sm text-zinc-300 mt-2 italic">
                                          "{source.evidence}"
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-400">
                      Select a workflow step to view details
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
} 