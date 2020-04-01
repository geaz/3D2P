import { h, Component } from 'preact';
import { css } from 'emotion'
import htm from 'htm';

import md from 'markdown-it';
import { WebGLRenderer, CanvasTexture, Sprite, SpriteMaterial, Raycaster, Camera,
        Vector2, Vector3, Group, Material, Geometry, BufferGeometry, Scene } from 'three';
import { StlViewerContext } from './threejs/StlViewerContext';

const html = htm.bind(h);

export interface IStlAnnotation {
    id: number;
    x: number;
    y: number;
    z: number;
    text: string;
}

export class AnnotationItemComponent extends Component<IAnnotationItemComponentProps, IAnnotationItemComponentState> {
    private _mdRenderer = new md();
    private _sprite?: Sprite;
    private _textareaElement?: HTMLElement;
    private _numberContainerElement?: HTMLElement;
    private _initHandler: () => void = this.initDepthSprite.bind(this);

    public componentWillMount() {
        this.initDepthSprite();        
        this.setState({ isEditMode: this.props.annotation.text === undefined });
        this.props.stlViewerContext.addStlLoadedListener(this._initHandler);
    }

    public componentDidMount() {
        this._textareaElement?.focus();
    }

    public componentDidUpdate() {
        if(this._sprite === undefined) {
            throw 'Annotation Item was not initialized correctly during mount phase!';
        }

        this._textareaElement?.focus();
        this._sprite.position.set(this.props.annotation.x, this.props.annotation.y, this.props.annotation.z);
    }

    public componentWillUnmount() {
        if(this._sprite !== undefined) {
            this.props.stlViewerContext.scene.remove(this._sprite);
        }
        this.props.stlViewerContext.removeStlLoadedListener(this._initHandler);
    }
    
    public render() {
        let annotationText = this.props.annotation.text === undefined || this.props.annotation.text === ''
            ? '<small>Marked</small>'
            : this._mdRenderer.render(this.props.annotation.text);

        let annotationBox = undefined;
        if(this.props.active) {
            annotationBox = html
                `<div class="annotation">
                    ${this.state.isEditMode && html
                        `<textarea placeholder="Annotation" oninput=${(e: any) => this.props.annotation.text = e.target.value}
                        ref=${(textarea: HTMLElement) => { this._textareaElement = textarea; }}>${this.props.annotation.text}</textarea>
                        <div class="button-container">
                            <div class="button" onclick=${this.onAnnotationSaved.bind(this)}>Save</div>
                            <div class="button" onclick=${this.onAnnotationDeleted.bind(this)}>Delete</div>
                        </div>`
                    }
                    ${!this.state.isEditMode && html
                        `<div class="annotation-content" dangerouslySetInnerHTML=${{__html:annotationText}}></div>
                        ${this.props.isEditable && html
                        `<div class="button-container">
                            <div class="button" onclick=${() => this.setState({ isEditMode: true })}>Edit</div>
                            <div class="button" onclick=${this.onAnnotationDeleted.bind(this)}>Delete</div>
                        </div>`}`
                    }                    
                </div>`;
        }

        return html
            `<div className=${this.css()}>
                <div class="number-container" 
                ref=${(numberContainer: HTMLElement) => { this._numberContainerElement = numberContainer; }}
                onclick="${this.onNumberClicked.bind(this)}">
                    <div class="number">${this.props.index + 1}</div>
                </div>
                ${annotationBox}
            </div>`;
    }

    private initDepthSprite(): void {
        if(this.props.stlViewerContext.StlMesh !== undefined) {
            if(this._sprite !== undefined) {
                this.props.stlViewerContext.scene.remove(this._sprite);
            }
            
            let canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;

            let ctx : CanvasRenderingContext2D | null = canvas.getContext('2d');
            if(ctx === null) {
                throw 'Couldnt get canvas context!';
            }
            ctx.fillRect(0, 0, 64, 64);

            let numberTexture = new CanvasTexture(canvas);
            let spriteMaterial = new SpriteMaterial({ map: numberTexture, opacity: 0 });

            this._sprite = new Sprite(spriteMaterial);
            this._sprite.name = this.Name;
            this._sprite.onBeforeRender = this.checkDepth.bind(this);
            this._sprite.position.set(this.props.annotation.x, this.props.annotation.y, this.props.annotation.z);

            this.props.stlViewerContext.scene.add(this._sprite);
        }
    }

    private checkDepth(renderer : WebGLRenderer, scene: Scene, camera: Camera, 
                        geometry: Geometry | BufferGeometry, material: Material, 
                        group: Group): void {
        if(this.ShouldShow) {
            let devicePos = this.DevicePos;
            let raycaster = new Raycaster();
            raycaster.setFromCamera({x: devicePos.x, y: devicePos.y}, camera);

            let numberVisible = true;
            let intersections = raycaster.intersectObjects([this.props.stlViewerContext.StlMesh, this._sprite!], true);        
            if(intersections.length > 0) {
                let obj1 = intersections[0];
                let obj2 = intersections[1];

                // Even, if the depth tested sprite is not the first intersected object,
                // it could be the case, that the sprite and the stl have the same distance.
                // In this case the number should be visible too.
                if(obj1.object.name !== this.Name) {
                    let distObj1 = raycaster.ray.origin.distanceTo(obj1.point).toFixed(4);
                    let distObj2 = raycaster.ray.origin.distanceTo(obj2.point).toFixed(4);
                    numberVisible = distObj1 === distObj2;
                }
            }
            
            // Don't update the css by state updates of the component,
            // to minimze the performance impact
            let screenPos = this.ScreenPos;
            (<HTMLElement>this.base).style.visibility = 'visible';
            (<HTMLElement>this.base).style.left = (screenPos.x - 16) +'px';
            (<HTMLElement>this.base).style.top = (screenPos.y - 16)+'px';
            (<HTMLElement>this.base).style.opacity = numberVisible ? '1': '0.2';
            this._numberContainerElement!.style.zIndex = numberVisible ? '1': '0';
        }
        else {            
            (<HTMLElement>this.base).style.visibility = 'hidden';
        }
    }

    private onAnnotationSaved(): void {
        this.setState({ isEditMode: false });
        if(this.props.annotation.text === undefined) this.props.annotation.text = '';
        
        if(this.props.onAnnotationSaved !== undefined) {
            this.props.onAnnotationSaved(this.props.annotation);
        }        
    }

    private onAnnotationDeleted(): void {
        if(this.props.onAnnotationDeleted !== undefined) {
            this.props.onAnnotationDeleted(this.props.annotation);
        }
    }

    private onNumberClicked(): void {
        if(this.props.onClicked !== undefined) {
            this.props.onClicked(this.props.index);
        }
    }

    get Name(): string {
        return `Annotation ${this.props.index + 1}`;
    }

    get ShouldShow(): boolean {
        let devicePos = this.DevicePos;    
        return devicePos.x >= -0.90 && devicePos.x <= 0.90 &&
        devicePos.y >= -0.90 && devicePos.y <= 0.90;
    }

    get ScreenPos(): Vector2 {
        let boundingBox = this.props.stlViewerContext.renderer.domElement.getBoundingClientRect();
        var width = boundingBox.width, height = boundingBox.height;
        var widthHalf = width / 2, heightHalf = height / 2;

        let devicePos = this.DevicePos;
        return new Vector2(( devicePos.x * widthHalf ) + widthHalf, -( devicePos.y * heightHalf ) + heightHalf);
    }

    get DevicePos(): Vector3 {
        if(this._sprite === undefined) {
            throw 'Annotation Item was not initialized correctly during mount phase!';
        }
        var pos = this._sprite.position.clone();
        return pos.project(this.props.stlViewerContext.camera);
    }

    get WorldPos(): Vector3 {
        if(this._sprite === undefined) {
            throw 'Annotation Item was not initialized correctly during mount phase!';
        }
        return this._sprite.position;
    }

    private css() {
        return css`
            display:flex;
            position: absolute;
            font: 1rem sans-serif;
            align-items: flex-start;

            .number-container {
                z-index: 1;
                color: #eee;
                border-radius: 5px;
                border: 1px solid #eee;
                background: rgb(0, 0, 0, 0.8);

                ${this.props.active && css
                    `color: red;`}

                &:hover {
                    color: red;
                    cursor: pointer;
                }
            }
            
            .number {
                width: 32px;
                line-height:32px;
                text-align: center;
                font-weight: bold;
                font-size: 1.2rem;
            }
            
            .annotation {
                z-index: 2;
                color: #eee;
                display:block;                
                max-width: 200px; 
                padding: 10px;                 
                margin-left: 15px;
                position:relative;
                background: rgb(17, 17, 17, 0.8);

                &::before {
                    content: '';
                    position:absolute;
                    right:100%;
                    top: 12px;
                    border-bottom: 5px solid transparent;
                    border-right: 5px solid rgb(17, 17, 17, 0.8);
                    border-top: 5px solid transparent;
                    clear: both;
                }

                .annotation-content {
                    display: block;
                    
                    p:first-child { margin-top: 0; }
                    p:last-child { margin-bottom: 0px; }
                    a { 
                        color: white; 
                        text-decoration: underline;
                        
                        &:hover {
                            color: #F58026;
                        }
                    }
                }        
                
                .button-container {
                    display: flex;
                    margin-top: 15px;

                    .button {
                        color: #B2B2B2;
                        padding-right: 15px;
                        font-weight: bold;
                        font-size: 0.7rem;

                        &:hover {
                            cursor: pointer;
                            color: #F58026;
                        }

                        &:last-child {
                            padding-right: 0;
                        }
                    }
                }
            }
            
            textarea {
                border:0;
                flex-grow:1;
                color: #eee;   
                width: 200px;        
                height: 250px;
                resize: vertical;
                background: transparent;
                font-size: 1rem!important;
                font-family: monospace!important;
            
                &:focus {
                    outline: none !important;
                }
            }`;
    }
}

interface IAnnotationItemComponentProps {
    index: number;
    active: boolean;
    isEditable: boolean;
    annotation: IStlAnnotation;
    stlViewerContext: StlViewerContext;
    onClicked: (index: number) => void;
    onAnnotationSaved: (annotation: IStlAnnotation) => void;
    onAnnotationDeleted: (annotation: IStlAnnotation) => void;
}

interface IAnnotationItemComponentState {
    isEditMode: boolean;
}